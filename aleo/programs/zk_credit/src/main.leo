// ZK Credit System Program for Privacy-Preserving Credit Scoring
// Implements undercollateralized lending with encrypted credit data

program zk_credit.aleo {
    // Private credit score record - all credit data encrypted
    record CreditScore {
        owner: address,
        score: u64,           // Credit score (0-850 range)
        last_updated: u32,    // Block height of last update
        verification_proof: field, // ZK proof of credit verification
        credit_history_hash: field, // Hash of payment history
        payment_count: u64,   // Number of payments made
        default_count: u64,   // Number of defaults
    }

    // Private loan record for undercollateralized lending
    record Loan {
        owner: address,
        borrower: address,
        lender: address,
        principal: u64,       // Loan amount
        interest_rate: u64,   // Interest rate in basis points
        term: u32,           // Loan term in blocks
        collateral_ratio: u64, // Collateral ratio in basis points (can be < 100%)
        status: u8,          // 0: active, 1: repaid, 2: defaulted
        issue_block: u32,    // Block when loan was issued
        due_block: u32,      // Block when loan is due
        loan_id: field,      // Unique loan identifier
    }

    // Credit verification proof record
    record CreditProof {
        owner: address,
        min_score_met: bool,  // Whether minimum score requirement is met
        proof_hash: field,    // Hash of the ZK proof
        verification_block: u32, // Block when proof was generated
        valid_until: u32,     // Block until proof is valid
    }

    // Payment history record for credit score updates
    record PaymentHistory {
        owner: address,
        loan_id: field,
        payment_amount: u64,
        payment_block: u32,
        is_on_time: bool,
        is_full_payment: bool,
        history_hash: field,  // Running hash of payment history
    }

    // Initialize a new credit score record
    transition initialize_credit_score(
        initial_score: u64,
        verification_proof: field,
        current_timestamp: u32
    ) -> CreditScore {
        // Ensure score is within valid range (300-850)
        assert(initial_score >= 300u64);
        assert(initial_score <= 850u64);
        
        // Generate initial credit history hash
        let history_hash: field = BHP256::hash_to_field(self.signer);
        
        return CreditScore {
            owner: self.signer,
            score: initial_score,
            last_updated: current_timestamp,
            verification_proof,
            credit_history_hash: history_hash,
            payment_count: 0u64,
            default_count: 0u64,
        };
    }

    // Verify creditworthiness without revealing actual score
    transition verify_creditworthiness(
        credit_score: CreditScore,
        min_score_required: u64,
        current_timestamp: u32
    ) -> CreditProof {
        // Verify ownership
        assert_eq(credit_score.owner, self.signer);
        
        // Check if score meets minimum requirement (private comparison)
        let score_meets_requirement: bool = credit_score.score >= min_score_required;
        
        // Generate proof hash
        let proof_hash: field = BHP256::hash_to_field(credit_score.verification_proof);
        
        // Set proof validity period (100 blocks)
        let valid_until: u32 = current_timestamp + 100u32;
        
        return CreditProof {
            owner: self.signer,
            min_score_met: score_meets_requirement,
            proof_hash,
            verification_block: current_timestamp,
            valid_until,
        };
    }

    // Issue undercollateralized loan based on credit proof
    transition issue_loan(
        credit_proof: CreditProof,
        principal: u64,
        interest_rate: u64,
        term: u32,
        collateral_ratio: u64,
        lender: address,
        current_timestamp: u32
    ) -> Loan {
        // Verify credit proof is valid and meets requirements
        assert_eq(credit_proof.owner, self.signer);
        assert(credit_proof.min_score_met);
        assert(credit_proof.valid_until > current_timestamp);
        
        // Verify loan parameters
        assert(principal > 0u64);
        assert(interest_rate > 0u64);
        assert(interest_rate <= 10000u64); // Max 100% APR
        assert(term > 0u32);
        assert(term <= 52560u32); // Max 1 year (assuming ~1 block per minute)
        
        // Allow undercollateralized loans (collateral_ratio can be < 10000 basis points)
        assert(collateral_ratio <= 15000u64); // Max 150% collateral
        
        // Generate unique loan ID
        let loan_id: field = BHP256::hash_to_field(self.signer);
        
        // Calculate due block
        let due_block: u32 = current_timestamp + term;
        
        return Loan {
            owner: self.signer,
            borrower: self.signer,
            lender,
            principal,
            interest_rate,
            term,
            collateral_ratio,
            status: 0u8, // Active
            issue_block: current_timestamp,
            due_block,
            loan_id,
        };
    }

    // Update credit score based on payment history
    transition update_credit_score(
        current_score: CreditScore,
        payment_history: PaymentHistory,
        current_timestamp: u32
    ) -> CreditScore {
        // Verify ownership
        assert_eq(current_score.owner, self.signer);
        assert_eq(payment_history.owner, self.signer);
        
        // Calculate score adjustment based on payment behavior
        let score_adjustment: u64 = calculate_score_adjustment(
            payment_history.is_on_time,
            payment_history.is_full_payment,
            current_score.payment_count
        );
        
        // Apply score adjustment (with bounds checking)
        let new_score: u64 = apply_score_change(current_score.score, score_adjustment, payment_history.is_on_time);
        
        // Update payment counts
        let new_payment_count: u64 = current_score.payment_count + 1u64;
        let new_default_count: u64 = payment_history.is_on_time ? 
            current_score.default_count : 
            current_score.default_count + 1u64;
        
        // Update credit history hash
        let new_history_hash: field = BHP256::hash_to_field(payment_history.history_hash);
        
        return CreditScore {
            owner: current_score.owner,
            score: new_score,
            last_updated: current_timestamp,
            verification_proof: current_score.verification_proof,
            credit_history_hash: new_history_hash,
            payment_count: new_payment_count,
            default_count: new_default_count,
        };
    }

    // Record payment for credit history tracking
    transition record_payment(
        loan: Loan,
        payment_amount: u64,
        previous_history: PaymentHistory,
        current_timestamp: u32
    ) -> (Loan, PaymentHistory) {
        // Verify loan ownership
        assert_eq(loan.borrower, self.signer);
        assert_eq(loan.status, 0u8); // Loan must be active
        
        // Verify payment amount
        assert(payment_amount > 0u64);
        
        // Check if payment is on time
        let is_on_time: bool = current_timestamp <= loan.due_block;
        
        // Calculate total amount due (principal + interest)
        let interest_amount: u64 = (loan.principal * loan.interest_rate) / 10000u64;
        let total_due: u64 = loan.principal + interest_amount;
        
        // Check if this is full payment
        let is_full_payment: bool = payment_amount >= total_due;
        
        // Update loan status if fully paid
        let new_status: u8 = is_full_payment ? 1u8 : loan.status;
        
        // Create updated loan record
        let updated_loan: Loan = Loan {
            owner: loan.owner,
            borrower: loan.borrower,
            lender: loan.lender,
            principal: loan.principal,
            interest_rate: loan.interest_rate,
            term: loan.term,
            collateral_ratio: loan.collateral_ratio,
            status: new_status,
            issue_block: loan.issue_block,
            due_block: loan.due_block,
            loan_id: loan.loan_id,
        };
        
        // Create new payment history record
        let new_history_hash: field = BHP256::hash_to_field(previous_history.history_hash);
        
        let new_payment_history: PaymentHistory = PaymentHistory {
            owner: self.signer,
            loan_id: loan.loan_id,
            payment_amount,
            payment_block: current_timestamp,
            is_on_time,
            is_full_payment,
            history_hash: new_history_hash,
        };
        
        return (updated_loan, new_payment_history);
    }

    // Mark loan as defaulted (can be called by lender after due date)
    transition mark_default(
        loan: Loan,
        current_timestamp: u32
    ) -> Loan {
        // Verify caller is the lender
        assert_eq(loan.lender, self.signer);
        
        // Verify loan is past due and still active
        assert(current_timestamp > loan.due_block);
        assert_eq(loan.status, 0u8);
        
        return Loan {
            owner: loan.owner,
            borrower: loan.borrower,
            lender: loan.lender,
            principal: loan.principal,
            interest_rate: loan.interest_rate,
            term: loan.term,
            collateral_ratio: loan.collateral_ratio,
            status: 2u8, // Defaulted
            issue_block: loan.issue_block,
            due_block: loan.due_block,
            loan_id: loan.loan_id,
        };
    }

    // Helper function to calculate score adjustment
    function calculate_score_adjustment(
        is_on_time: bool,
        is_full_payment: bool,
        payment_count: u64
    ) -> u64 {
        // Base adjustment for on-time payments
        let base_adjustment: u64 = is_on_time ? 5u64 : 0u64;
        
        // Bonus for full payments
        let full_payment_bonus: u64 = is_full_payment ? 3u64 : 0u64;
        
        // Diminishing returns for many payments
        let payment_factor: u64 = payment_count < 10u64 ? 2u64 : 1u64;
        
        return (base_adjustment + full_payment_bonus) * payment_factor;
    }

    // Helper function to apply score changes with bounds
    function apply_score_change(
        current_score: u64,
        adjustment: u64,
        is_positive: bool
    ) -> u64 {
        if (is_positive) {
            // Increase score but cap at 850
            let new_score: u64 = current_score + adjustment;
            return new_score > 850u64 ? 850u64 : new_score;
        } else {
            // Decrease score but floor at 300
            let penalty: u64 = adjustment * 2u64; // Penalties are 2x adjustments
            let new_score: u64 = current_score > penalty ? 
                current_score - penalty : 300u64;
            return new_score;
        }
    }

    // Verify loan eligibility based on credit score and loan parameters
    transition verify_loan_eligibility(
        credit_score: CreditScore,
        requested_principal: u64,
        requested_collateral_ratio: u64
    ) -> bool {
        // Verify ownership
        assert_eq(credit_score.owner, self.signer);
        
        // Calculate maximum loan amount based on credit score
        let max_loan_multiplier: u64 = calculate_loan_multiplier(credit_score.score);
        let max_loan_amount: u64 = max_loan_multiplier * 1000u64; // Base amount * multiplier
        
        // Check if requested amount is within limits
        let amount_eligible: bool = requested_principal <= max_loan_amount;
        
        // Check collateral requirements based on credit score
        let min_collateral_ratio: u64 = calculate_min_collateral_ratio(credit_score.score);
        let collateral_eligible: bool = requested_collateral_ratio >= min_collateral_ratio;
        
        return amount_eligible && collateral_eligible;
    }

    // Helper function to calculate loan multiplier based on credit score
    function calculate_loan_multiplier(score: u64) -> u64 {
        // Higher credit scores allow larger loans
        if (score >= 750u64) {
            return 100u64; // Excellent credit: up to 100k base units
        } else if (score >= 700u64) {
            return 50u64;   // Good credit: up to 50k base units
        } else if (score >= 650u64) {
            return 25u64;   // Fair credit: up to 25k base units
        } else {
            return 10u64;   // Poor credit: up to 10k base units
        }
    }

    // Helper function to calculate minimum collateral ratio based on credit score
    function calculate_min_collateral_ratio(score: u64) -> u64 {
        // Higher credit scores require less collateral
        if (score >= 750u64) {
            return 5000u64;  // 50% collateral for excellent credit
        } else if (score >= 700u64) {
            return 7500u64;  // 75% collateral for good credit
        } else if (score >= 650u64) {
            return 10000u64; // 100% collateral for fair credit
        } else {
            return 12500u64; // 125% collateral for poor credit
        }
    }
}
