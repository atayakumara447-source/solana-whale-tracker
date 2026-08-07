import express from 'express';
import transactionRoutes from './transaction.routes.js';
import watchedWalletRoutes from './watchedWallet.routes.js';
import statsRoutes from './stats.routes.js';

const router = express.Router();

router.use('/transactions', transactionRoutes);
router.use('/wallets', watchedWalletRoutes);
router.use('/stats', statsRoutes);

export default router;