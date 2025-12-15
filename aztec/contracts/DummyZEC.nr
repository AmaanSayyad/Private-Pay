// Dummy ZEC Token Contract on Aztec
// Private token for testing bridge functionality

use dep::aztec::{
    context::{Context, PrivateContext, PublicContext},
    note::Note,
    state_vars::Map,
    types::{Address, Field, U256},
};

contract DummyZEC {
    // Asset ID for this token
    asset_id: PublicState<Field> = PublicState::new();
    
    // Total supply tracking
    total_supply: PublicState<U256> = PublicState::new();
    
    // Minter address (bridge contract)
    minter: PublicState<Address> = PublicState::new();

    // Initialize token
    #[aztec(public)]
    fn constructor(
        context: &mut PublicContext,
        asset_id: Field,
        minter_address: Address,
    ) {
        Self::at(context, 0).asset_id.write(asset_id);
        Self::at(context, 0).minter.write(minter_address);
        Self::at(context, 0).total_supply.write(0);
    }

    // Mint tokens (only by minter/bridge)
    #[aztec(private)]
    fn mint(
        context: &mut PrivateContext,
        recipient: Address,
        amount: U256,
    ) {
        // Check caller is minter
        let minter = Self::at(context, 0).minter.read();
        assert(context.msg_sender() == minter, "Not authorized to mint");
        
        // Create private note
        let asset_id = Self::at(context, 0).asset_id.read();
        let note = Note::new(asset_id, recipient, amount);
        note.insert(context);
        
        // Update total supply
        let supply = Self::at(context, 0).total_supply.read();
        Self::at(context, 0).total_supply.write(supply + amount);
    }

    // Burn tokens
    #[aztec(private)]
    fn burn(
        context: &mut PrivateContext,
        amount: U256,
    ) {
        let asset_id = Self::at(context, 0).asset_id.read();
        
        // Select notes to burn
        let notes = Note::select(context, asset_id, amount);
        
        // Remove notes (burn)
        for note in notes {
            note.remove(context);
        }
        
        // Update total supply
        let supply = Self::at(context, 0).total_supply.read();
        assert(supply >= amount, "Insufficient supply");
        Self::at(context, 0).total_supply.write(supply - amount);
    }

    // Private transfer
    #[aztec(private)]
    fn transfer(
        context: &mut PrivateContext,
        recipient: Address,
        amount: U256,
    ) {
        let asset_id = Self::at(context, 0).asset_id.read();
        
        // Select notes to spend
        let notes = Note::select(context, asset_id, amount);
        
        // Remove spent notes
        for note in notes {
            note.remove(context);
        }
        
        // Create new note for recipient
        let new_note = Note::new(asset_id, recipient, amount);
        new_note.insert(context);
    }

    // Get total supply
    #[aztec(public)]
    fn get_total_supply(context: &Context) -> U256 {
        Self::at(context, 0).total_supply.read()
    }
}





