# 🔗 RPC Setup Guide for Token-Gating

This guide explains how to configure RPC endpoints for token-gating functionality in PeBloq.

## 🎯 Overview

Token-gating requires blockchain RPC endpoints to verify user token holdings. PeBloq supports:

- **Abstract Global Wallet** (Primary)
- **Ethereum Mainnet** (Fallback)
- **Polygon** (Additional support)

## ⚙️ Configuration

### 1. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

### 2. Required RPC Endpoints

#### Abstract Global Wallet (Recommended)

```env
# Primary RPC (fastest response)
ABSTRACT_RPC_URL="https://api.abs.xyz"

# Network-specific endpoints
ABSTRACT_MAINNET_RPC="https://api.abs.xyz"
```

#### Alternative Providers

If you need additional reliability, consider these providers:

```env
# Alchemy (requires API key)
ABSTRACT_RPC_URL="https://abs-mainnet.g.alchemy.com/v2/YOUR_API_KEY"

# Infura (requires project ID)
ABSTRACT_RPC_URL="https://abs-mainnet.infura.io/v3/YOUR_PROJECT_ID"

# QuickNode (requires endpoint URL)
ABSTRACT_RPC_URL="https://your-endpoint.abs.quiknode.pro/YOUR_TOKEN"
```

## 🚀 Quick Start

### For Production (Mainnet)

```env
# .env.local
ABSTRACT_RPC_URL="https://api.abs.xyz"
BLOCKCHAIN_NETWORK="mainnet"
NODE_ENV="production"
```

## 🔧 Advanced Configuration

### Multiple RPC Providers (Redundancy)

The system automatically tries multiple RPC URLs for reliability:

1. **Primary**: `ABSTRACT_RPC_URL`
2. **Fallback**: Network-specific URLs
3. **Default**: Built-in public endpoints

### Custom Chain Configuration

For custom networks, update `src/lib/blockchain/rpc.ts`:

```typescript
export const NETWORKS: Record<string, NetworkConfig> = {
  your_custom_network: {
    name: 'Your Custom Network',
    chainId: 12345,
    rpcUrl: 'https://your-rpc-url.com',
    blockExplorer: 'https://your-explorer.com',
    nativeCurrency: {
      name: 'Custom Token',
      symbol: 'CUSTOM',
      decimals: 18
    }
  }
}
```

## 🧪 Testing RPC Connection

Test your RPC configuration:

```bash
# Start the development server
npm run dev

# Check console for RPC connection logs
# ✅ "Token gating service initialized with RPC: https://..."
# ❌ "Failed to initialize token gating provider: ..."
```

### Manual Testing

You can test RPC connectivity manually:

```javascript
// In browser console or Node.js
const { RpcConfig } = require('./src/lib/blockchain/rpc');

// Test connection
RpcConfig.testRpcConnection('https://api.abs.xyz')
  .then(result => console.log('Connection test:', result));

// Get working RPC
RpcConfig.getWorkingRpcUrl()
  .then(url => console.log('Working RPC:', url));
```

## 🔒 Security Best Practices

### API Key Protection

Never expose API keys in client-side code:

```env
# ✅ Good - Server-side only
ABSTRACT_RPC_URL="https://api.provider.com/YOUR_SECRET_KEY"

# ❌ Bad - Client-side exposure
NEXT_PUBLIC_RPC_URL="https://api.provider.com/YOUR_SECRET_KEY"
```

### Rate Limiting

Most RPC providers have rate limits:

- **Free tier**: ~100 requests/second
- **Paid tier**: Higher limits
- **Enterprise**: Custom limits

### Cost Optimization

1. **Cache results** when possible
2. **Batch requests** for multiple tokens
3. **Use public RPCs** for development
4. **Upgrade to paid** for production

## 🐛 Troubleshooting

### Common Issues

#### "Network connection error"
- Check RPC URL is correct
- Verify internet connection
- Try alternative RPC provider

#### "Invalid contract address"
- Ensure contract exists on the network
- Check contract address format (0x...)
- Verify network matches contract deployment

#### "Rate limit exceeded"
- Reduce request frequency
- Upgrade to paid RPC plan
- Use multiple RPC providers

### Debug Mode

Enable debug logging:

```env
DEBUG_RPC="true"
LOG_LEVEL="debug"
```

This will show detailed RPC interaction logs.

## 📊 Monitoring

### RPC Health Checks

The system includes built-in health checks:

- **Connection testing** on startup
- **Automatic failover** to backup RPCs
- **Error logging** for troubleshooting

### Performance Metrics

Monitor these metrics:

- **Response time**: < 500ms ideal
- **Success rate**: > 99% target
- **Error rate**: < 1% acceptable

## 🔄 Network Switching

### Production Network

Ensure you're using mainnet:

```env
# Mainnet Configuration
BLOCKCHAIN_NETWORK="mainnet"
ABSTRACT_RPC_URL="https://api.abs.xyz"
```

### Chain ID Validation

Ensure chain IDs match your network:

```env
ABSTRACT_MAINNET_CHAIN_ID=11124
```

## 📞 Support

### RPC Provider Support

- **Abstract**: [Abstract Docs](https://docs.abs.xyz)
- **Alchemy**: [Alchemy Dashboard](https://dashboard.alchemy.com)
- **Infura**: [Infura Dashboard](https://infura.io/dashboard)
- **QuickNode**: [QuickNode Dashboard](https://www.quicknode.com/dashboard)

### PeBloq Issues

If you encounter issues with token-gating:

1. Check RPC configuration
2. Test network connectivity
3. Verify contract addresses
4. Review error logs
5. Open GitHub issue with details

---

✅ **Ready to go!** Your token-gating system will now work with proper RPC configuration.