// Simple test program for deployment
program testpoolenliven.aleo {
    // Program state
    mapping initialized: bool => bool;
    
    // Initialize function - required for deployment
    async transition initialize() -> Future {
        return finalize_initialize();
    }
    
    async function finalize_initialize() {
        Mapping::set(initialized, true, true);
    }
    
    // Simple addition function
    transition sum(public a: u32, public b: u32) -> u32 {
        return a + b;
    }
}