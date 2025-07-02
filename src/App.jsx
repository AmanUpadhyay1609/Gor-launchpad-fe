import './App.css'
import { TokenLaunchpad } from './components/TokenLaunchpad'

// wallet adapter imports
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  return (
    <div className="min-h-screen w-full transition-colors duration-300">
      <ConnectionProvider endpoint={"https://rpc.gorbchain.xyz"}>
        <WalletProvider wallets={[]} autoConnect>
            <WalletModalProvider>
              <div className="flex justify-between items-center px-6 py-4 w-full max-w-5xl mx-auto">
                <WalletMultiButton />
                <WalletDisconnectButton />
              </div>
              <TokenLaunchpad />
            </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  )
}

export default App
