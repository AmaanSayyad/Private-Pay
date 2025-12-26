// Private Lending Program for Privacy-Preserving Lending Pools
// Implements encrypted lending and borrowing positions with interest calculations

program private_lending.aleo {
    // Private lending position record
    record LendingPosition {
        owner: address,
        pool_id: field,
        principal: u64,           // Amount lent to the pool
        accrued_interest: u64,    // Interest earned so far
        last_update: u32,         // Block height of last interest update
        interest_rate: u64,       // Interest rate in basis points
        shares: u64,              // Pool shares owned
        deposit_block: u32,       // Block when position was created
    }

    // Private borrowing position record
    record BorrowPosition {
        owner: address,
        pool_id: field,
        borrowed_amount: u64,     // Amount borrowed from pool
        collateral_amount: u64,   // Collateral provided
        interest_rate: u64,       // Borrowing interest rate in basis points
        last_update: u32,         // Block height of last interest update
        accrued_interest: u64,    // Interest owed so far
        liquidation_threshold: u64, // Collateral ratio for liquidation (basis points)
        borrow_block: u32,        // Block when loan was taken
        due_block: u32,           // Block when loan is due
    }

    // Pool liquidity tracking record (for pool operators)
    record PoolLiquidity {
        owner: address,           // Pool operator
        pool_id: field,
        total_deposits: u64,      // Total amount deposited
        total_borrowed: u64,      // Total amount borrowed
        available_liquidity: u64, // Available for borrowing
        total_shares: u64,        // Total pool shares issued
        base_interest_rate: u64,  // Base lending rate in basis points
        utilization_rate: u64,    // Pool utilization percentage
        last_update: u32,         // Last update block
    }

    // Collateral record for borrowing
    record Collateral {
        owner: address,
        pool_id: field,
        token_type: field,        // Type of collateral token
        amount: u64,              // Amount of collateral
        value_usd: u64,           // USD value of collateral
        liquidation_threshold: u64, // Threshold for liquidation
        deposit_block: u32,       // When collateral was deposited
    }

    // Interest calculation record
    record InterestCalculation {
        owner: address,
        position_id: field,
        principal: u64,
        interest_rate: u64,
        time_elapsed: u32,        // Blocks elapsed
        calculated_interest: u64,
        calculation_block: u32,
    }

    // Deposit funds into lending pool
    transition deposit(
        pool_id: field,
        amount: u64,
        base_interest_rate: u64,
        current_timestamp: u32
    ) -> LendingPosition {
        // Verify deposit amount
        assert(amount > 0u64);
        assert(base_interest_rate > 0u64);
        assert(base_interest_rate <= 2000u64); // Max 20% APR
        
        // Calculate initial shares (1:1 ratio for first deposit)
        let shares: u64 = amount;
        
        return LendingPosition {
            owner: self.signer,
            pool_id,
            principal: amount,
            accrued_interest: 0u64,
            last_update: current_timestamp,
            interest_rate: base_interest_rate,
            shares,
            deposit_block: current_timestamp,
        };
    }

    // Borrow from lending pool with collateral
    transition borrow(
        pool_id: field,
        borrow_amount: u64,
        collateral: Collateral,
        credit_proof: field,      // ZK proof of creditworthiness
        loan_term: u32,
        current_timestamp: u32
    ) -> BorrowPosition {
        // Verify borrow parameters
        assert(borrow_amount > 0u64);
        assert(loan_term > 0u32);
        assert(loan_term <= 26280u32); // Max 6 months
        
        // Verify collateral ownership and pool match
        assert_eq(collateral.owner, self.signer);
        assert_eq(collateral.pool_id, pool_id);
        
        // Calculate collateral ratio
        let collateral_ratio: u64 = (collateral.value_usd * 10000u64) / borrow_amount;
        
        // Verify sufficient collateral (minimum 120% for most loans)
        assert(collateral_ratio >= 12000u64);
        
        // Calculate borrowing interest rate (higher than lending rate)
        let borrow_interest_rate: u64 = calculate_borrow_rate(collateral_ratio, credit_proof);
        
        // Calculate due block
        let due_block: u32 = current_timestamp + loan_term;
        
        return BorrowPosition {
            owner: self.signer,
            pool_id,
            borrowed_amount: borrow_amount,
            collateral_amount: collateral.amount,
            interest_rate: borrow_interest_rate,
            last_update: current_timestamp,
            accrued_interest: 0u64,
            liquidation_threshold: collateral.liquidation_threshold,
            borrow_block: current_timestamp,
            due_block,
        };
    }

    // Repay loan partially or fully
    transition repay(
        position: BorrowPosition,
        repay_amount: u64,
        current_timestamp: u32
    ) -> BorrowPosition {
        // Verify position ownership
        assert_eq(position.owner, self.signer);
        assert(repay_amount > 0u64);
        
        // Calculate current interest owed
        let blocks_elapsed: u32 = current_timestamp - position.last_update;
        let new_interest: u64 = calculate_interest(
            position.borrowed_amount,
            position.interest_rate,
            blocks_elapsed
        );
        
        let total_interest: u64 = position.accrued_interest + new_interest;
        let total_owed: u64 = position.borrowed_amount + total_interest;
        
        // Verify repayment doesn't exceed amount owed
        assert(repay_amount <= total_owed);
        
        // Calculate remaining debt after payment
        let remaining_debt: u64 = total_owed > repay_amount ? 
            total_owed - repay_amount : 0u64;
        
        // Update borrowed amount (pay interest first, then principal)
        let interest_payment: u64 = repay_amount > total_interest ? 
            total_interest : repay_amount;
        let principal_payment: u64 = repay_amount > total_interest ? 
            repay_amount - total_interest : 0u64;
        
        let new_borrowed_amount: u64 = position.borrowed_amount > principal_payment ?
            position.borrowed_amount - principal_payment : 0u64;
        let new_accrued_interest: u64 = total_interest > interest_payment ?
            total_interest - interest_payment : 0u64;
        
        return BorrowPosition {
            owner: position.owner,
            pool_id: position.pool_id,
            borrowed_amount: new_borrowed_amount,
            collateral_amount: position.collateral_amount,
            interest_rate: position.interest_rate,
            last_update: current_timestamp,
            accrued_interest: new_accrued_interest,
            liquidation_threshold: position.liquidation_threshold,
            borrow_block: position.borrow_block,
            due_block: position.due_block,
        };
    }

    // Withdraw from lending position
    transition withdraw(
        position: LendingPosition,
        withdraw_amount: u64,
        current_timestamp: u32
    ) -> LendingPosition {
        // Verify position ownership
        assert_eq(position.owner, self.signer);
        assert(withdraw_amount > 0u64);
        
        // Calculate current interest earned
        let blocks_elapsed: u32 = current_timestamp - position.last_update;
        let new_interest: u64 = calculate_interest(
            position.principal,
            position.interest_rate,
            blocks_elapsed
        );
        
        let total_available: u64 = position.principal + position.accrued_interest + new_interest;
        
        // Verify sufficient funds available
        assert(withdraw_amount <= total_available);
        
        // Calculate remaining position
        let remaining_amount: u64 = total_available - withdraw_amount;
        
        // Calculate new shares proportionally
        let new_shares: u64 = (position.shares * remaining_amount) / total_available;
        
        return LendingPosition {
            owner: position.owner,
            pool_id: position.pool_id,
            principal: remaining_amount,
            accrued_interest: 0u64, // Reset since we calculated total
            last_update: current_timestamp,
            interest_rate: position.interest_rate,
            shares: new_shares,
            deposit_block: position.deposit_block,
        };
    }

    // Update interest for lending position
    transition update_lending_interest(
        position: LendingPosition,
        current_timestamp: u32
    ) -> LendingPosition {
        // Verify position ownership
        assert_eq(position.owner, self.signer);
        
        // Calculate blocks elapsed since last update
        let blocks_elapsed: u32 = current_timestamp - position.last_update;
        
        // Calculate new interest earned
        let new_interest: u64 = calculate_interest(
            position.principal,
            position.interest_rate,
            blocks_elapsed
        );
        
        return LendingPosition {
            owner: position.owner,
            pool_id: position.pool_id,
            principal: position.principal,
            accrued_interest: position.accrued_interest + new_interest,
            last_update: current_timestamp,
            interest_rate: position.interest_rate,
            shares: position.shares,
            deposit_block: position.deposit_block,
        };
    }

    // Update interest for borrow position
    transition update_borrow_interest(
        position: BorrowPosition,
        current_timestamp: u32
    ) -> BorrowPosition {
        // Verify position ownership
        assert_eq(position.owner, self.signer);
        
        // Calculate blocks elapsed since last update
        let blocks_elapsed: u32 = current_timestamp - position.last_update;
        
        // Calculate new interest owed
        let new_interest: u64 = calculate_interest(
            position.borrowed_amount,
            position.interest_rate,
            blocks_elapsed
        );
        
        return BorrowPosition {
            owner: position.owner,
            pool_id: position.pool_id,
            borrowed_amount: position.borrowed_amount,
            collateral_amount: position.collateral_amount,
            interest_rate: position.interest_rate,
            last_update: current_timestamp,
            accrued_interest: position.accrued_interest + new_interest,
            liquidation_threshold: position.liquidation_threshold,
            borrow_block: position.borrow_block,
            due_block: position.due_block,
        };
    }

    // Liquidate undercollateralized position
    transition liquidate(
        position: BorrowPosition,
        collateral: Collateral,
        liquidator: address,
        current_timestamp: u32
    ) -> (BorrowPosition, Collateral) {
        // Verify collateral matches position
        assert_eq(collateral.owner, position.owner);
        assert_eq(collateral.pool_id, position.pool_id);
        
        // Calculate current debt including interest
        let blocks_elapsed: u32 = current_timestamp - position.last_update;
        let new_interest: u64 = calculate_interest(
            position.borrowed_amount,
            position.interest_rate,
            blocks_elapsed
        );
        let total_debt: u64 = position.borrowed_amount + position.accrued_interest + new_interest;
        
        // Calculate current collateral ratio
        let collateral_ratio: u64 = (collateral.value_usd * 10000u64) / total_debt;
        
        // Verify position is undercollateralized
        assert(collateral_ratio < position.liquidation_threshold);
        
        // Calculate liquidation amounts
        let liquidation_amount: u64 = total_debt + (total_debt / 10u64); // 10% liquidation penalty
        let collateral_to_liquidator: u64 = liquidation_amount > collateral.value_usd ?
            collateral.amount : (collateral.amount * liquidation_amount) / collateral.value_usd;
        
        // Update position (mark as liquidated by setting borrowed_amount to 0)
        let liquidated_position: BorrowPosition = BorrowPosition {
            owner: position.owner,
            pool_id: position.pool_id,
            borrowed_amount: 0u64, // Liquidated
            collateral_amount: 0u64, // Collateral seized
            interest_rate: position.interest_rate,
            last_update: current_timestamp,
            accrued_interest: 0u64,
            liquidation_threshold: position.liquidation_threshold,
            borrow_block: position.borrow_block,
            due_block: position.due_block,
        };
        
        // Transfer collateral to liquidator
        let liquidator_collateral: Collateral = Collateral {
            owner: liquidator,
            pool_id: collateral.pool_id,
            token_type: collateral.token_type,
            amount: collateral_to_liquidator,
            value_usd: (collateral.value_usd * collateral_to_liquidator) / collateral.amount,
            liquidation_threshold: collateral.liquidation_threshold,
            deposit_block: current_timestamp,
        };
        
        return (liquidated_position, liquidator_collateral);
    }

    // Update pool liquidity metrics
    transition update_pool_liquidity(
        pool: PoolLiquidity,
        deposit_change: u64,
        borrow_change: u64,
        is_deposit_increase: bool,
        is_borrow_increase: bool,
        current_timestamp: u32
    ) -> PoolLiquidity {
        // Verify pool ownership
        assert_eq(pool.owner, self.signer);
        
        // Update total deposits
        let new_total_deposits: u64 = is_deposit_increase ?
            pool.total_deposits + deposit_change :
            pool.total_deposits - deposit_change;
        
        // Update total borrowed
        let new_total_borrowed: u64 = is_borrow_increase ?
            pool.total_borrowed + borrow_change :
            pool.total_borrowed - borrow_change;
        
        // Calculate available liquidity
        let new_available_liquidity: u64 = new_total_deposits > new_total_borrowed ?
            new_total_deposits - new_total_borrowed : 0u64;
        
        // Calculate utilization rate
        let new_utilization_rate: u64 = new_total_deposits > 0u64 ?
            (new_total_borrowed * 10000u64) / new_total_deposits : 0u64;
        
        return PoolLiquidity {
            owner: pool.owner,
            pool_id: pool.pool_id,
            total_deposits: new_total_deposits,
            total_borrowed: new_total_borrowed,
            available_liquidity: new_available_liquidity,
            total_shares: pool.total_shares,
            base_interest_rate: pool.base_interest_rate,
            utilization_rate: new_utilization_rate,
            last_update: current_timestamp,
        };
    }

    // Helper function to calculate interest
    function calculate_interest(
        principal: u64,
        interest_rate: u64,
        blocks_elapsed: u32
    ) -> u64 {
        // Simple interest calculation: (principal * rate * time) / (10000 * blocks_per_year)
        // Assuming ~525,600 blocks per year (1 block per minute)
        let annual_interest: u64 = (principal * interest_rate) / 10000u64;
        let interest_per_block: u64 = annual_interest / 525600u64;
        return interest_per_block * (blocks_elapsed as u64);
    }

    // Helper function to calculate borrowing interest rate
    function calculate_borrow_rate(
        collateral_ratio: u64,
        credit_proof: field
    ) -> u64 {
        // Base rate starts at 8% APR (800 basis points)
        let base_rate: u64 = 800u64;
        
        // Adjust based on collateral ratio (lower collateral = higher rate)
        let collateral_adjustment: u64 = collateral_ratio < 15000u64 ?
            (15000u64 - collateral_ratio) / 100u64 : 0u64;
        
        // Credit proof can reduce rate (simplified - in practice would verify ZK proof)
        let credit_discount: u64 = credit_proof != 0field ? 100u64 : 0u64;
        
        let final_rate: u64 = base_rate + collateral_adjustment - credit_discount;
        
        // Cap at reasonable maximum (25% APR)
        return final_rate > 2500u64 ? 2500u64 : final_rate;
    }

    // Helper function to calculate health factor
    function calculate_health_factor(
        collateral_value: u64,
        debt_value: u64,
        liquidation_threshold: u64
    ) -> u64 {
        // Health factor = (collateral_value * liquidation_threshold) / debt_value
        // Values > 10000 (100%) are healthy
        if (debt_value == 0u64) {
            return 99999u64; // Max health factor
        }
        
        return (collateral_value * liquidation_threshold) / (debt_value * 100u64);
    }

    // Check if position is healthy (above liquidation threshold)
    transition check_position_health(
        position: BorrowPosition,
        collateral: Collateral,
        current_timestamp: u32
    ) -> bool {
        // Verify ownership and matching
        assert_eq(position.owner, self.signer);
        assert_eq(collateral.owner, self.signer);
        assert_eq(position.pool_id, collateral.pool_id);
        
        // Calculate current debt
        let blocks_elapsed: u32 = current_timestamp - position.last_update;
        let new_interest: u64 = calculate_interest(
            position.borrowed_amount,
            position.interest_rate,
            blocks_elapsed
        );
        let total_debt: u64 = position.borrowed_amount + position.accrued_interest + new_interest;
        
        // Calculate health factor
        let health_factor: u64 = calculate_health_factor(
            collateral.value_usd,
            total_debt,
            position.liquidation_threshold
        );
        
        return health_factor >= 10000u64; // Healthy if >= 100%
    }
}
