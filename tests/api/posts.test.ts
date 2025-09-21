// API tests for posts endpoints

import request from 'supertest'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'

const app = next({ dev: false, quiet: true })
const handle = app.getRequestHandler()

describe('/api/posts', () => {
  let server: any
  let testUser: any
  let testUser2: any

  beforeAll(async () => {
    await app.prepare()
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    })
  })

  beforeEach(async () => {
    // Create test users
    testUser = await testHelpers.createTestUser({
      username: 'testposter',
      displayName: 'Test Poster'
    })
    testUser2 = await testHelpers.createTestUser({
      username: 'testviewer',
      displayName: 'Test Viewer'
    })
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /api/posts', () => {
    it('should return empty array when no posts exist', async () => {
      const response = await request(server)
        .get('/api/posts')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.posts).toEqual([])
    })

    it('should return posts with author information', async () => {
      // Create a test post
      const post = await testHelpers.createTestPost(testUser.id)

      const response = await request(server)
        .get('/api/posts')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.posts).toHaveLength(1)
      expect(response.body.posts[0]).toMatchObject({
        id: post.id,
        content: post.content,
        author: {
          id: testUser.id,
          username: testUser.username,
          displayName: testUser.displayName
        },
        stats: {
          likes: 0,
          comments: 0,
          shares: 0
        }
      })
    })

    it('should filter posts by author', async () => {
      // Create posts from different users
      await testHelpers.createTestPost(testUser.id, { content: 'Post by user 1' })
      await testHelpers.createTestPost(testUser2.id, { content: 'Post by user 2' })

      const response = await request(server)
        .get(`/api/posts?authorId=${testUser.id}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.posts).toHaveLength(1)
      expect(response.body.posts[0].content).toBe('Post by user 1')
    })

    it('should respect limit parameter', async () => {
      // Create multiple posts
      for (let i = 0; i < 5; i++) {
        await testHelpers.createTestPost(testUser.id, { content: `Post ${i}` })
      }

      const response = await request(server)
        .get('/api/posts?limit=3')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.posts).toHaveLength(3)
      expect(response.body.pagination.limit).toBe(3)
    })
  })

  describe('POST /api/posts', () => {
    it('should create a post with authentication', async () => {
      const postData = {
        content: 'This is a new test post',
        contentType: 'TEXT',
        visibility: 'PUBLIC'
      }

      const response = await request(server)
        .post('/api/posts')
        .set(testHelpers.createAuthHeaders(testUser.id))
        .send(postData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.post).toMatchObject({
        content: postData.content,
        contentType: postData.contentType,
        visibility: postData.visibility,
        author: {
          id: testUser.id,
          username: testUser.username
        }
      })
    })

    it('should reject post without authentication', async () => {
      const postData = {
        content: 'This should fail'
      }

      const response = await request(server)
        .post('/api/posts')
        .send(postData)
        .expect(401)

      expect(response.body.error).toContain('Authentication required')
    })

    it('should reject empty content', async () => {
      const postData = {
        content: ''
      }

      const response = await request(server)
        .post('/api/posts')
        .set(testHelpers.createAuthHeaders(testUser.id))
        .send(postData)
        .expect(400)

      expect(response.body.error).toContain('Content is required')
    })

    it('should reject content that exceeds limit', async () => {
      const postData = {
        content: 'a'.repeat(2001) // Exceeds 2000 character limit
      }

      const response = await request(server)
        .post('/api/posts')
        .set(testHelpers.createAuthHeaders(testUser.id))
        .send(postData)
        .expect(400)

      expect(response.body.error).toContain('cannot exceed 2000 characters')
    })

    it('should handle media URLs array', async () => {
      const postData = {
        content: 'Post with media',
        mediaUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      }

      const response = await request(server)
        .post('/api/posts')
        .set(testHelpers.createAuthHeaders(testUser.id))
        .send(postData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.post.mediaUrls).toEqual(postData.mediaUrls)
    })
  })

  describe('GET /api/posts/[id]', () => {
    it('should return specific post with full details', async () => {
      const post = await testHelpers.createTestPost(testUser.id)

      const response = await request(server)
        .get(`/api/posts/${post.id}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.post).toMatchObject({
        id: post.id,
        content: post.content,
        author: {
          id: testUser.id,
          username: testUser.username
        },
        likes: [],
        comments: [],
        shares: []
      })
    })

    it('should return 404 for non-existent post', async () => {
      const response = await request(server)
        .get('/api/posts/non-existent-id')
        .expect(404)

      expect(response.body.error).toBe('Post not found')
    })
  })

  describe('POST /api/posts/[id]/like', () => {
    it('should like a post', async () => {
      const post = await testHelpers.createTestPost(testUser.id)

      const response = await request(server)
        .post(`/api/posts/${post.id}/like`)
        .set(testHelpers.createAuthHeaders(testUser2.id))
        .send({ userId: testUser2.id })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.like.userId).toBe(testUser2.id)
      expect(response.body.like.postId).toBe(post.id)
      expect(response.body.likeCount).toBe(1)
    })

    it('should reject duplicate likes', async () => {
      const post = await testHelpers.createTestPost(testUser.id)

      // First like
      await request(server)
        .post(`/api/posts/${post.id}/like`)
        .set(testHelpers.createAuthHeaders(testUser2.id))
        .send({ userId: testUser2.id })
        .expect(201)

      // Second like should fail
      const response = await request(server)
        .post(`/api/posts/${post.id}/like`)
        .set(testHelpers.createAuthHeaders(testUser2.id))
        .send({ userId: testUser2.id })
        .expect(409)

      expect(response.body.error).toBe('Post already liked')
    })

    it('should create notification for post author', async () => {
      const post = await testHelpers.createTestPost(testUser.id)

      await request(server)
        .post(`/api/posts/${post.id}/like`)
        .set(testHelpers.createAuthHeaders(testUser2.id))
        .send({ userId: testUser2.id })
        .expect(201)

      // Check notification was created
      const prisma = testHelpers.getPrisma()
      const notification = await prisma.notification.findFirst({
        where: {
          fromUserId: testUser2.id,
          toUserId: testUser.id,
          type: 'LIKE'
        }
      })

      expect(notification).toBeTruthy()
    })
  })

  describe('DELETE /api/posts/[id]/like', () => {
    it('should unlike a post', async () => {
      const post = await testHelpers.createTestPost(testUser.id)

      // First like the post
      await request(server)
        .post(`/api/posts/${post.id}/like`)
        .set(testHelpers.createAuthHeaders(testUser2.id))
        .send({ userId: testUser2.id })
        .expect(201)

      // Then unlike it
      const response = await request(server)
        .delete(`/api/posts/${post.id}/like?userId=${testUser2.id}`)
        .set(testHelpers.createAuthHeaders(testUser2.id))
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.likeCount).toBe(0)
    })

    it('should return 404 for non-existent like', async () => {
      const post = await testHelpers.createTestPost(testUser.id)

      const response = await request(server)
        .delete(`/api/posts/${post.id}/like?userId=${testUser2.id}`)
        .set(testHelpers.createAuthHeaders(testUser2.id))
        .expect(404)

      expect(response.body.error).toBe('Like not found')
    })
  })
})