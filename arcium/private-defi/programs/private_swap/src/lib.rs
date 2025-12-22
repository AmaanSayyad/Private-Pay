use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use arcium_anchor::prelude::*;

const COMP_DEF_OFFSET_SWAP: u32 = comp_def_offset("execute_swap");

declare_id!("6qqmuL4qmRMXrpPsUPsKLzabsbSoiKHRdhH817xFE1aa");

#[arcium_program]
pub mod private_swap {
    use super::*;

    /// Initialize the computation definition for private swaps
    pub fn init_swap_comp_def(ctx: Context<InitSwapCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Initialize a swap pool for a token pair
    pub fn init_pool(
        ctx: Context<InitPool>,
        fee_rate: u16, // Fee in basis points (100 = 1%)
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.token_mint_a = ctx.accounts.token_mint_a.key();
        pool.token_mint_b = ctx.accounts.token_mint_b.key();
        pool.reserve_a = 0;
        pool.reserve_b = 0;
        pool.fee_rate = fee_rate;
        pool.bump = ctx.bumps.pool;
        pool.total_swaps = 0;
        Ok(())
    }

    /// Add liquidity to the pool
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amount_a: u64,
        amount_b: u64,
    ) -> Result<()> {
        // Transfer token A to pool
        let cpi_accounts_a = Transfer {
            from: ctx.accounts.user_token_a.to_account_info(),
            to: ctx.accounts.pool_token_a.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx_a = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_a);
        token::transfer(cpi_ctx_a, amount_a)?;

        // Transfer token B to pool
        let cpi_accounts_b = Transfer {
            from: ctx.accounts.user_token_b.to_account_info(),
            to: ctx.accounts.pool_token_b.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx_b = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_b);
        token::transfer(cpi_ctx_b, amount_b)?;

        // Update pool reserves
        let pool = &mut ctx.accounts.pool;
        pool.reserve_a = pool.reserve_a.checked_add(amount_a).unwrap();
        pool.reserve_b = pool.reserve_b.checked_add(amount_b).unwrap();

        emit!(LiquidityAdded {
            pool: pool.key(),
            amount_a,
            amount_b,
        });

        Ok(())
    }

    /// Execute a private swap with encrypted amount
    /// The swap amount is encrypted and processed by MPC nodes
    pub fn execute_swap(
        ctx: Context<ExecuteSwap>,
        computation_offset: u64,
        encrypted_amount: [u8; 64], // Encrypted swap amount
        min_output: u64,            // Minimum output (slippage protection)
        is_a_to_b: bool,            // Swap direction
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        let pool = &ctx.accounts.pool;
        
        // Build encrypted arguments for MPC
        let args = ArgBuilder::new()
            .x25519_pubkey(pub_key)
            .plaintext_u128(nonce)
            .encrypted_bytes(encrypted_amount)
            .plaintext_u64(pool.reserve_a)
            .plaintext_u64(pool.reserve_b)
            .plaintext_u64(min_output)
            .plaintext_bool(is_a_to_b)
            .plaintext_u16(pool.fee_rate)
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Queue the MPC computation
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![ExecuteSwapCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Callback after MPC computation completes
    #[arcium_callback(encrypted_ix = "execute_swap")]
    pub fn execute_swap_callback(
        ctx: Context<ExecuteSwapCallback>,
        output: SignedComputationOutputs<SwapOutput>,
    ) -> Result<()> {
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(SwapOutput { amount_in, amount_out, success }) => {
                if !success {
                    return Err(ErrorCode::SwapFailed.into());
                }
                (amount_in, amount_out)
            }
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(SwapExecuted {
            amount_in: result.0,
            amount_out: result.1,
        });

        Ok(())
    }
}

// ============ Account Structures ============

#[account]
pub struct SwapPool {
    pub authority: Pubkey,
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,
    pub reserve_a: u64,
    pub reserve_b: u64,
    pub fee_rate: u16,
    pub bump: u8,
    pub total_swaps: u64,
}

impl SwapPool {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 2 + 1 + 8;
}

// ============ Instruction Contexts ============

#[derive(Accounts)]
pub struct InitPool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + SwapPool::SIZE,
        seeds = [b"pool", token_mint_a.key().as_ref(), token_mint_b.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, SwapPool>,
    
    /// CHECK: Token mint A
    pub token_mint_a: AccountInfo<'info>,
    /// CHECK: Token mint B
    pub token_mint_b: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub pool: Account<'info, SwapPool>,
    
    #[account(mut)]
    pub user_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_token_b: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[queue_computation_accounts("execute_swap", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ExecuteSwap<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut)]
    pub pool: Account<'info, SwapPool>,
    
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SWAP))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    pub token_program: Program<'info, Token>,
}

#[callback_accounts("execute_swap")]
#[derive(Accounts)]
pub struct ExecuteSwapCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SWAP))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
}

#[init_computation_definition_accounts("execute_swap", payer)]
#[derive(Accounts)]
pub struct InitSwapCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    
    #[account(mut)]
    /// CHECK: comp_def_account
    pub comp_def_account: UncheckedAccount<'info>,
    
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// ============ Events ============

#[event]
pub struct LiquidityAdded {
    pub pool: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
}

#[event]
pub struct SwapExecuted {
    pub amount_in: u64,
    pub amount_out: u64,
}

// ============ Errors ============

#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("The cluster is not set")]
    ClusterNotSet,
    #[msg("Swap failed - slippage exceeded or insufficient liquidity")]
    SwapFailed,
    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,
}
