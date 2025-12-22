use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

const COMP_DEF_OFFSET_INIT_BALANCE: u32 = comp_def_offset("init_balance");
const COMP_DEF_OFFSET_DEPOSIT: u32 = comp_def_offset("deposit");

declare_id!("7oNtYFkJ9sgDBLCEN8mYjLCYQUQ3ZvPRnTRAV9kb5QhP");

#[arcium_program]
pub mod private_pay {
    use super::*;

    /// Initialize computation definition for balance creation
    pub fn init_balance_comp_def(ctx: Context<InitBalanceCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Initialize computation definition for deposits
    pub fn init_deposit_comp_def(ctx: Context<InitDepositCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Create a private balance account for a user
    /// The balance is encrypted and stored on-chain
    pub fn create_balance_account(
        ctx: Context<CreateBalanceAccount>,
        computation_offset: u64,
        nonce: u128,
    ) -> Result<()> {
        let args = ArgBuilder::new()
            .plaintext_u128(nonce)
            .plaintext_pubkey(ctx.accounts.payer.key())
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Initialize balance account
        let balance_account = &mut ctx.accounts.balance_account;
        balance_account.owner = ctx.accounts.payer.key();
        balance_account.bump = ctx.bumps.balance_account;
        balance_account.nonce = nonce;
        balance_account.balance_state = [0u8; 64]; // Will be set by MPC

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![CreateBalanceCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Callback after balance account creation
    #[arcium_callback(encrypted_ix = "init_balance")]
    pub fn create_balance_callback(
        ctx: Context<CreateBalanceCallback>,
        output: SignedComputationOutputs<InitBalanceOutput>,
    ) -> Result<()> {
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(InitBalanceOutput { success }) => success,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        if !result {
            return Err(ErrorCode::InitializationFailed.into());
        }

        emit!(BalanceCreated {
            owner: ctx.accounts.balance_account.owner,
        });

        Ok(())
    }

    /// Deposit funds into private balance
    /// Amount is encrypted and added to the user's balance
    pub fn deposit_funds(
        ctx: Context<DepositFunds>,
        computation_offset: u64,
        amount: u64,
    ) -> Result<()> {
        // Transfer SOL to the balance account
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.payer.key(),
            &ctx.accounts.balance_account.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.balance_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let args = ArgBuilder::new()
            .plaintext_u64(amount)
            .plaintext_pubkey(ctx.accounts.payer.key())
            .plaintext_u128(ctx.accounts.balance_account.nonce)
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![DepositCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Callback after deposit completes
    #[arcium_callback(encrypted_ix = "deposit")]
    pub fn deposit_callback(
        ctx: Context<DepositCallback>,
        output: SignedComputationOutputs<DepositOutput>,
    ) -> Result<()> {
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(DepositOutput { new_balance, success }) => {
                if !success {
                    return Err(ErrorCode::DepositFailed.into());
                }
                new_balance
            }
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(FundsDeposited {
            owner: ctx.accounts.balance_account.owner,
            new_balance: result,
        });

        Ok(())
    }
}

// ============ Account Structures ============

#[account]
pub struct PrivateBalanceAccount {
    pub owner: Pubkey,
    pub bump: u8,
    pub balance_state: [u8; 64], // Encrypted balance
    pub nonce: u128,
}

impl PrivateBalanceAccount {
    pub const SIZE: usize = 8 + 32 + 1 + 64 + 16;
}

// ============ Instruction Contexts ============

#[queue_computation_accounts("init_balance", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CreateBalanceAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + PrivateBalanceAccount::SIZE,
        seeds = [b"balance", payer.key().as_ref()],
        bump,
    )]
    pub balance_account: Account<'info, PrivateBalanceAccount>,
    
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
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_BALANCE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("init_balance")]
#[derive(Accounts)]
pub struct CreateBalanceCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_BALANCE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    
    #[account(mut)]
    pub balance_account: Account<'info, PrivateBalanceAccount>,
    
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
}

#[queue_computation_accounts("deposit", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct DepositFunds<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"balance", payer.key().as_ref()],
        bump = balance_account.bump,
        constraint = balance_account.owner == payer.key() @ ErrorCode::InvalidAuthority,
    )]
    pub balance_account: Account<'info, PrivateBalanceAccount>,
    
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
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEPOSIT))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("deposit")]
#[derive(Accounts)]
pub struct DepositCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEPOSIT))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    
    #[account(mut)]
    pub balance_account: Account<'info, PrivateBalanceAccount>,
    
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
}

#[init_computation_definition_accounts("init_balance", payer)]
#[derive(Accounts)]
pub struct InitBalanceCompDef<'info> {
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

#[init_computation_definition_accounts("deposit", payer)]
#[derive(Accounts)]
pub struct InitDepositCompDef<'info> {
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
pub struct BalanceCreated {
    pub owner: Pubkey,
}

#[event]
pub struct FundsDeposited {
    pub owner: Pubkey,
    pub new_balance: u64,
}

// ============ Errors ============

#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("The cluster is not set")]
    ClusterNotSet,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Initialization failed")]
    InitializationFailed,
    #[msg("Deposit failed")]
    DepositFailed,
}
