import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'

const PORT = parseInt(process.env.PORT || '4000')
const HOST = '0.0.0.0'

const app = Fastify({
  logger: {
    level: 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      }
    } : undefined
  }
})

async function start() {
  try {
    // Security plugins
    await app.register(helmet, {
      contentSecurityPolicy: false
    })

    await app.register(cors, {
      origin: [
        process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
        'http://localhost:3000'
      ],
      credentials: true
    })

    // Multipart support for file uploads
    await app.register(multipart, {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB - no Vercel limits!
        files: 5
      }
    })

    // Import route handlers
    const authRoutes = await import('./routes/auth.js')
    const postsRoutes = await import('./routes/posts.js')
    const usersRoutes = await import('./routes/users.js')
    const uploadRoutes = await import('./routes/upload.js')
    const commentsRoutes = await import('./routes/comments.js')
    const notificationsRoutes = await import('./routes/notifications.js')
    const communitiesRoutes = await import('./routes/communities.js')

    // Root route - API info
    app.get('/', async () => {
      return {
        name: 'PeBloq API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          auth: '/auth',
          posts: '/posts',
          users: '/users',
          upload: '/upload',
          comments: '/comments',
          notifications: '/notifications',
          communities: '/communities'
        }
      }
    })

    // Health check
    app.get('/health', async () => {
      return {
        status: 'ok',
        service: 'pebloq-api',
        timestamp: new Date().toISOString()
      }
    })

    // Example route
    app.get('/hello', async () => {
      return { message: 'Hello from PeBloq API!' }
    })

    // Register routes
    await app.register(authRoutes.default, { prefix: '/auth' })
    await app.register(postsRoutes.default, { prefix: '/posts' })
    await app.register(usersRoutes.default, { prefix: '/users' })
    await app.register(uploadRoutes.default, { prefix: '/upload' })
    await app.register(commentsRoutes.default, { prefix: '/comments' })
    await app.register(notificationsRoutes.default, { prefix: '/notifications' })
    await app.register(communitiesRoutes.default, { prefix: '/communities' })

    // Start server
    await app.listen({ port: PORT, host: HOST })

    app.log.info(`🚀 PeBloq API ready at http://${HOST}:${PORT}`)
    app.log.info(`📊 Health check: http://${HOST}:${PORT}/health`)
    app.log.info('')
    app.log.info('📋 Available routes:')
    app.log.info('  🔐 /auth - Authentication (wallet login, nonce, OAuth)')
    app.log.info('  📝 /posts - Posts (CRUD, likes, comments)')
    app.log.info('  👤 /users - Users (profile, search, follow)')
    app.log.info('  📤 /upload - Uploads (Cloudinary direct upload)')
    app.log.info('  💬 /comments - Comments (create, list, delete)')
    app.log.info('  🔔 /notifications - Notifications (list, mark read)')
    app.log.info('  👥 /communities - Communities (create, join, members)')

  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
