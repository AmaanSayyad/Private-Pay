/**
 * Stealth Payment Scanner Worker
 * Runs in background to detect stealth payments
 */

import { scanTransactionsForPayments } from './stealthReceiver';
import { fetchAllTransactions } from './transactionService';
import { getAllReceivedPayments } from './indexedDB';

class StealthScanner {
    constructor() {
        this.isScanning = false;
        this.scanInterval = null;
        this.wallet = null;
        this.stealthAddresses = [];
        this.lastScanBlock = {};
        this.onPaymentReceived = null;
    }

    /**
     * Start scanning for stealth payments
     */
    start(wallet, stealthAddresses, onPaymentReceived) {
        if (this.isScanning) {
            console.log('⚠️ Scanner already running');
            return;
        }

        this.wallet = wallet;
        this.stealthAddresses = stealthAddresses;
        this.onPaymentReceived = onPaymentReceived;
        this.isScanning = true;

        console.log('🔍 Starting stealth payment scanner...');
        console.log(`   Watching ${stealthAddresses.length} stealth addresses`);

        // Initial scan
        this.scan();

        // Scan every 30 seconds
        this.scanInterval = setInterval(() => {
            this.scan();
        }, 30000);
    }

    /**
     * Stop scanning
     */
    stop() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        this.isScanning = false;
        console.log('🛑 Stealth payment scanner stopped');
    }

    /**
     * Perform a scan for new payments
     */
    async scan() {
        if (!this.wallet || this.stealthAddresses.length === 0) {
            return;
        }

        try {
            console.log('🔍 Scanning for stealth payments...');

            // Fetch recent transactions (last 20)
            const transactions = await fetchAllTransactions(this.wallet, 20);

            if (!transactions || transactions.length === 0) {
                return;
            }

            // Scan for stealth payments
            const detectedPayments = await scanTransactionsForPayments(
                transactions,
                this.stealthAddresses,
                this.wallet
            );

            if (detectedPayments.length > 0) {
                console.log(`✅ Found ${detectedPayments.length} stealth payment(s)!`);

                // Notify callback
                if (this.onPaymentReceived) {
                    detectedPayments.forEach(payment => {
                        this.onPaymentReceived(payment);
                    });
                }
            }
        } catch (error) {
            console.error('Error during stealth scan:', error);
        }
    }

    /**
     * Update stealth addresses being watched
     */
    updateStealthAddresses(stealthAddresses) {
        this.stealthAddresses = stealthAddresses;
        console.log(`🔄 Updated watch list: ${stealthAddresses.length} addresses`);
    }

    /**
     * Get scanning status
     */
    getStatus() {
        return {
            isScanning: this.isScanning,
            addressCount: this.stealthAddresses.length,
            lastScanBlock: this.lastScanBlock
        };
    }

    /**
     * Manual scan trigger
     */
    async scanNow() {
        console.log('🔍 Manual scan triggered');
        await this.scan();
    }
}

// Create singleton instance
const scanner = new StealthScanner();

export default scanner;
