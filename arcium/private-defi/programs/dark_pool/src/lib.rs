use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use arcium_anchor::prelude::*;

const COMP_DEF_OFFSET_ADD_ORDER: u32 = comp_def_offset("add_order");
const COMP_DEF_OFFSET_MATCH_ORDERS: u32 = comp_def_offset("match_orders");
const COMP_DEF_OFFSET_CANCEL_ORDER: u32 = comp_def_offset("cancel_order");

declare_id!("ExmtDaTNpjZbgx2qABKG4AkxV5NTKbg5P7WY1iThqJAG");

#[arcium_program]
pub mod dark_pool {
    use super::*;

    /// Initialize computation definitions for dark pool operations
    pub fn init_add_order_comp_def(ctx: Context<InitAddOrderCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn init_match_orders_comp_def(ctx: Context<InitMatchOrdersCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn init_cancel_order_comp_def(ctx: Context<InitCancelOrderCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Initialize a dark pool order book for a trading pair
    pub fn init_order_book(
        ctx: Context<InitOrderBook>,
        fee_rate: u16,
    ) -> Result<()> {
        let order_book = &mut ctx.accounts.order_book;
        order_book.authority = ctx.accounts.authority.key();
        order_book.base_mint = ctx.accounts.base_mint.key();
        order_book.quote_mint = ctx.accounts.quote_mint.key();
        order_book.fee_rate = fee_rate;
        order_book.bump = ctx.bumps.order_book;
        order_book.total_orders = 0;
        order_book.total_matches = 0;
        order_book.active_orders = 0;
        Ok(())
    }

    /// Add a hidden order to the dark pool
    /// Order details (price, size) are encrypted
    pub fn add_order(
        ctx: Context<AddOrder>,
        computation_offset: u64,
        encrypted_price: [u8; 64],  // Encrypted limit price
        encrypted_size: [u8; 64],   // Encrypted order size
        is_buy: bool,               // Order side (buy/sell)
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        let order_book = &ctx.accounts.order_book;
        
        // Build encrypted arguments
        let args = ArgBuilder::new()
            .x25519_pubkey(pub_key)
            .plaintext_u128(nonce)
            .encrypted_bytes(encrypted_price)
            .encrypted_bytes(encrypted_size)
            .plaintext_bool(is_buy)
            .plaintext_pubkey(ctx.accounts.payer.key())
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Queue MPC computation to add order
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![AddOrderCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Callback after order is added
    #[arcium_callback(encrypted_ix = "add_order")]
    pub fn add_order_callback(
        ctx: Context<AddOrderCallback>,
        output: SignedComputationOutputs<AddOrderOutput>,
    ) -> Result<()> {
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(AddOrderOutput { order_id, success }) => {
                if !success {
                    return Err(ErrorCode::OrderFailed.into());
                }
                order_id
            }
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(OrderAdded { order_id: result });
        Ok(())
    }

    /// Trigger order matching in the dark pool
    /// MPC nodes will match orders without revealing individual order details
    pub fn match_orders(
        ctx: Context<MatchOrders>,
        computation_offset: u64,
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        let args = ArgBuilder::new()
            .x25519_pubkey(pub_key)
            .plaintext_u128(nonce)
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![MatchOrdersCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Callback after order matching completes
    #[arcium_callback(encrypted_ix = "match_orders")]
    pub fn match_orders_callback(
        ctx: Context<MatchOrdersCallback>,
        output: SignedComputationOutputs<MatchOutput>,
    ) -> Result<()> {
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(MatchOutput { matches_count, total_volume }) => (matches_count, total_volume),
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(OrdersMatched {
            matches_count: result.0,
            total_volume: result.1,
        });
        Ok(())
    }

    /// Cancel an existing order
    pub fn cancel_order(
        ctx: Context<CancelOrder>,
        computation_offset: u64,
        order_id: u64,
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        let args = ArgBuilder::new()
            .x25519_pubkey(pub_key)
            .plaintext_u128(nonce)
            .plaintext_u64(order_id)
            .plaintext_pubkey(ctx.accounts.payer.key())
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![CancelOrderCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Callback after order cancellation
    #[arcium_callback(encrypted_ix = "cancel_order")]
    pub fn cancel_order_callback(
        ctx: Context<CancelOrderCallback>,
        output: SignedComputationOutputs<CancelOutput>,
    ) -> Result<()> {
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(CancelOutput { order_id, success }) => {
                if !success {
                    return Err(ErrorCode::CancelFailed.into());
                }
                order_id
            }
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(OrderCancelled { order_id: result });
        Ok(())
    }
}

// ============ Account Structures ============

#[account]
pub struct OrderBook {
    pub authority: Pubkey,
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub fee_rate: u16,
    pub bump: u8,
    pub total_orders: u64,
    pub total_matches: u64,
    pub active_orders: u32,
}

impl OrderBook {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 2 + 1 + 8 + 8 + 4;
}

// ============ Instruction Contexts ============

#[derive(Accounts)]
pub struct InitOrderBook<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + OrderBook::SIZE,
        seeds = [b"orderbook", base_mint.key().as_ref(), quote_mint.key().as_ref()],
        bump,
    )]
    pub order_book: Account<'info, OrderBook>,
    
    /// CHECK: Base token mint
    pub base_mint: AccountInfo<'info>,
    /// CHECK: Quote token mint
    pub quote_mint: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("add_order", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct AddOrder<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,
    
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
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_ADD_ORDER))]
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

#[callback_accounts("add_order")]
#[derive(Accounts)]
pub struct AddOrderCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_ADD_ORDER))]
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

#[queue_computation_accounts("match_orders", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct MatchOrders<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,
    
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
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_MATCH_ORDERS))]
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

#[callback_accounts("match_orders")]
#[derive(Accounts)]
pub struct MatchOrdersCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_MATCH_ORDERS))]
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

#[queue_computation_accounts("cancel_order", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CancelOrder<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,
    
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
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CANCEL_ORDER))]
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

#[callback_accounts("cancel_order")]
#[derive(Accounts)]
pub struct CancelOrderCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CANCEL_ORDER))]
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

#[init_computation_definition_accounts("add_order", payer)]
#[derive(Accounts)]
pub struct InitAddOrderCompDef<'info> {
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

#[init_computation_definition_accounts("match_orders", payer)]
#[derive(Accounts)]
pub struct InitMatchOrdersCompDef<'info> {
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

#[init_computation_definition_accounts("cancel_order", payer)]
#[derive(Accounts)]
pub struct InitCancelOrderCompDef<'info> {
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
pub struct OrderAdded {
    pub order_id: u64,
}

#[event]
pub struct OrdersMatched {
    pub matches_count: u32,
    pub total_volume: u64,
}

#[event]
pub struct OrderCancelled {
    pub order_id: u64,
}

// ============ Errors ============

#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("The cluster is not set")]
    ClusterNotSet,
    #[msg("Failed to add order")]
    OrderFailed,
    #[msg("Failed to cancel order")]
    CancelFailed,
    #[msg("Unauthorized")]
    Unauthorized,
}
