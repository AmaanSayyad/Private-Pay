/**
 * Encrypted Notes Management
 * 
 * Handles encrypted notes for Aztec private state
 */

/**
 * Encrypted Note Structure
 * Represents a private note on Aztec
 */
export class EncryptedNote {
  constructor(commitment, nullifier, value, owner, assetId = 0) {
    this.commitment = commitment; // Note commitment (hash)
    this.nullifier = nullifier; // Nullifier for spending
    this.value = value; // Encrypted value
    this.owner = owner; // Owner address (encrypted)
    this.assetId = assetId; // Asset identifier (0 for native, token address for tokens)
    this.createdAt = Date.now();
  }

  /**
   * Serialize note to JSON
   * @returns {Object} Serialized note
   */
  toJSON() {
    return {
      commitment: this.commitment,
      nullifier: this.nullifier,
      value: this.value,
      owner: this.owner,
      assetId: this.assetId,
      createdAt: this.createdAt,
    };
  }

  /**
   * Create note from JSON
   * @param {Object} json - Serialized note
   * @returns {EncryptedNote} Note instance
   */
  static fromJSON(json) {
    const note = new EncryptedNote(
      json.commitment,
      json.nullifier,
      json.value,
      json.owner,
      json.assetId
    );
    note.createdAt = json.createdAt;
    return note;
  }
}

/**
 * Note Manager
 * Manages encrypted notes for a user
 */
export class NoteManager {
  constructor() {
    this.notes = new Map(); // commitment -> EncryptedNote
    this.nullifiers = new Set(); // Track spent notes
  }

  /**
   * Add a note
   * @param {EncryptedNote} note - Note to add
   */
  addNote(note) {
    this.notes.set(note.commitment, note);
  }

  /**
   * Get note by commitment
   * @param {string} commitment - Note commitment
   * @returns {EncryptedNote|null} Note or null
   */
  getNote(commitment) {
    return this.notes.get(commitment) || null;
  }

  /**
   * Mark note as spent
   * @param {string} nullifier - Note nullifier
   */
  markSpent(nullifier) {
    this.nullifiers.add(nullifier);
    
    // Remove note from active notes
    for (const [commitment, note] of this.notes.entries()) {
      if (note.nullifier === nullifier) {
        this.notes.delete(commitment);
        break;
      }
    }
  }

  /**
   * Check if nullifier is already spent
   * @param {string} nullifier - Nullifier to check
   * @returns {boolean} True if spent
   */
  isSpent(nullifier) {
    return this.nullifiers.has(nullifier);
  }

  /**
   * Get all unspent notes
   * @param {number} assetId - Optional asset ID filter
   * @returns {Array<EncryptedNote>} List of unspent notes
   */
  getUnspentNotes(assetId = null) {
    const unspent = [];
    
    for (const note of this.notes.values()) {
      if (!this.nullifiers.has(note.nullifier)) {
        if (assetId === null || note.assetId === assetId) {
          unspent.push(note);
        }
      }
    }
    
    return unspent;
  }

  /**
   * Get total balance for an asset
   * @param {number} assetId - Asset ID
   * @returns {bigint} Total balance
   */
  getBalance(assetId = 0) {
    const unspent = this.getUnspentNotes(assetId);
    return unspent.reduce((total, note) => {
      // In production, decrypt note.value
      // For now, assume value is a bigint
      return total + BigInt(note.value || 0);
    }, 0n);
  }

  /**
   * Select notes for a payment
   * @param {bigint} amount - Amount needed
   * @param {number} assetId - Asset ID
   * @returns {Array<EncryptedNote>} Selected notes
   */
  selectNotesForPayment(amount, assetId = 0) {
    const unspent = this.getUnspentNotes(assetId);
    const selected = [];
    let total = 0n;

    // Simple selection algorithm (can be improved)
    for (const note of unspent) {
      selected.push(note);
      total += BigInt(note.value || 0);
      
      if (total >= amount) {
        break;
      }
    }

    if (total < amount) {
      throw new Error('Insufficient balance');
    }

    return selected;
  }

  /**
   * Export notes to JSON
   * @returns {Object} Serialized notes
   */
  exportNotes() {
    return {
      notes: Array.from(this.notes.values()).map(note => note.toJSON()),
      nullifiers: Array.from(this.nullifiers),
    };
  }

  /**
   * Import notes from JSON
   * @param {Object} data - Serialized notes
   */
  importNotes(data) {
    this.notes.clear();
    this.nullifiers.clear();

    for (const noteData of data.notes || []) {
      const note = EncryptedNote.fromJSON(noteData);
      this.notes.set(note.commitment, note);
    }

    for (const nullifier of data.nullifiers || []) {
      this.nullifiers.add(nullifier);
    }
  }
}

/**
 * Create note manager instance
 * @returns {NoteManager} Note manager instance
 */
export function createNoteManager() {
  return new NoteManager();
}



