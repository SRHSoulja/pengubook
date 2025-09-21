// Unit tests for validation utilities

import { Validator, validate, schemas } from '../../src/lib/validation'

describe('Validation utilities', () => {
  describe('Validator class', () => {
    let validator: Validator

    beforeEach(() => {
      validator = new Validator()
    })

    describe('string validation', () => {
      it('should validate required strings', () => {
        const result = validator.string('test', 'field', { required: true })
        expect(result).toBe('test')
        expect(validator.getResult().isValid).toBe(true)
      })

      it('should fail for missing required strings', () => {
        const result = validator.string(null, 'field', { required: true })
        expect(result).toBe(null)
        expect(validator.getResult().isValid).toBe(false)
        expect(validator.getResult().errors).toContain('field is required')
      })

      it('should trim strings by default', () => {
        const result = validator.string('  test  ', 'field')
        expect(result).toBe('test')
      })

      it('should validate string length', () => {
        validator.string('ab', 'field', { minLength: 3 })
        expect(validator.getResult().errors).toContain('field must be at least 3 characters')

        validator.clear()
        validator.string('abcdef', 'field', { maxLength: 5 })
        expect(validator.getResult().errors).toContain('field cannot exceed 5 characters')
      })

      it('should validate string patterns', () => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        validator.string('invalid-email', 'email', { pattern: emailPattern })
        expect(validator.getResult().errors).toContain('email format is invalid')

        validator.clear()
        validator.string('valid@email.com', 'email', { pattern: emailPattern })
        expect(validator.getResult().isValid).toBe(true)
      })
    })

    describe('number validation', () => {
      it('should validate numbers', () => {
        const result = validator.number('42', 'field')
        expect(result).toBe(42)
        expect(validator.getResult().isValid).toBe(true)
      })

      it('should validate number ranges', () => {
        validator.number('5', 'field', { min: 10 })
        expect(validator.getResult().errors).toContain('field must be at least 10')

        validator.clear()
        validator.number('15', 'field', { max: 10 })
        expect(validator.getResult().errors).toContain('field cannot exceed 10')
      })

      it('should validate integers', () => {
        validator.number('3.14', 'field', { integer: true })
        expect(validator.getResult().errors).toContain('field must be an integer')

        validator.clear()
        const result = validator.number('42', 'field', { integer: true })
        expect(result).toBe(42)
        expect(validator.getResult().isValid).toBe(true)
      })

      it('should handle invalid numbers', () => {
        const result = validator.number('not-a-number', 'field')
        expect(result).toBe(null)
        expect(validator.getResult().errors).toContain('field must be a valid number')
      })
    })

    describe('boolean validation', () => {
      it('should validate boolean values', () => {
        expect(validator.boolean(true, 'field')).toBe(true)
        expect(validator.boolean(false, 'field')).toBe(false)
        expect(validator.boolean('true', 'field')).toBe(true)
        expect(validator.boolean('false', 'field')).toBe(false)
        expect(validator.boolean('1', 'field')).toBe(true)
        expect(validator.boolean('0', 'field')).toBe(false)
        expect(validator.boolean(1, 'field')).toBe(true)
        expect(validator.boolean(0, 'field')).toBe(false)
      })

      it('should handle invalid booleans', () => {
        const result = validator.boolean('invalid', 'field')
        expect(result).toBe(null)
        expect(validator.getResult().errors).toContain('field must be a valid boolean')
      })
    })

    describe('array validation', () => {
      it('should validate arrays', () => {
        const result = validator.array(['a', 'b', 'c'], 'field')
        expect(result).toEqual(['a', 'b', 'c'])
        expect(validator.getResult().isValid).toBe(true)
      })

      it('should parse JSON strings', () => {
        const result = validator.array('["a", "b", "c"]', 'field')
        expect(result).toEqual(['a', 'b', 'c'])
      })

      it('should validate array length', () => {
        validator.array(['a'], 'field', { minLength: 2 })
        expect(validator.getResult().errors).toContain('field must have at least 2 items')

        validator.clear()
        validator.array(['a', 'b', 'c'], 'field', { maxLength: 2 })
        expect(validator.getResult().errors).toContain('field cannot have more than 2 items')
      })

      it('should validate array items', () => {
        const itemValidator = (item: any) => typeof item === 'string'

        validator.array(['a', 1, 'c'], 'field', { itemValidator })
        expect(validator.getResult().errors).toContain('field[1] is invalid')
      })
    })

    describe('specialized validators', () => {
      it('should validate email addresses', () => {
        const result = validator.email('test@example.com', 'email')
        expect(result).toBe('test@example.com')
        expect(validator.getResult().isValid).toBe(true)

        validator.clear()
        validator.email('invalid-email', 'email')
        expect(validator.getResult().errors).toContain('email format is invalid')
      })

      it('should validate URLs', () => {
        const result = validator.url('https://example.com', 'url')
        expect(result).toBe('https://example.com')
        expect(validator.getResult().isValid).toBe(true)

        validator.clear()
        validator.url('not-a-url', 'url')
        expect(validator.getResult().errors).toContain('url format is invalid')
      })

      it('should validate wallet addresses', () => {
        const validAddress = '0x1234567890123456789012345678901234567890'
        const result = validator.walletAddress(validAddress, 'wallet')
        expect(result).toBe(validAddress)
        expect(validator.getResult().isValid).toBe(true)

        validator.clear()
        validator.walletAddress('invalid-address', 'wallet')
        expect(validator.getResult().errors).toContain('wallet format is invalid')
      })

      it('should validate usernames', () => {
        const result = validator.username('test_user-123', 'username')
        expect(result).toBe('test_user-123')
        expect(validator.getResult().isValid).toBe(true)

        validator.clear()
        validator.username('test user', 'username') // spaces not allowed
        expect(validator.getResult().errors).toContain('username format is invalid')

        validator.clear()
        validator.username('ab', 'username') // too short
        expect(validator.getResult().errors).toContain('username must be at least 3 characters')
      })

      it('should validate content', () => {
        const result = validator.content('This is valid content', 'content')
        expect(result).toBe('This is valid content')
        expect(validator.getResult().isValid).toBe(true)

        validator.clear()
        const longContent = 'a'.repeat(2001)
        validator.content(longContent, 'content', 2000)
        expect(validator.getResult().errors).toContain('content cannot exceed 2000 characters')
      })
    })
  })

  describe('validate function', () => {
    it('should provide convenient validation interface', () => {
      const result = validate((v) => ({
        name: v.string('John', 'name', { required: true }),
        email: v.email('john@example.com', 'email', true),
        age: v.number('25', 'age', { min: 18, max: 100 })
      }))

      expect(result.isValid).toBe(true)
      expect(result.sanitizedData).toEqual({
        name: 'John',
        email: 'john@example.com',
        age: 25
      })
    })

    it('should return validation errors', () => {
      const result = validate((v) => ({
        name: v.string('', 'name', { required: true }),
        email: v.email('invalid-email', 'email', true),
        age: v.number('15', 'age', { min: 18 })
      }))

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('name cannot be empty')
      expect(result.errors).toContain('email format is invalid')
      expect(result.errors).toContain('age must be at least 18')
    })
  })

  describe('schemas', () => {
    describe('createPost schema', () => {
      it('should validate valid post data', () => {
        const postData = {
          content: 'This is a valid post',
          contentType: 'TEXT',
          mediaUrls: ['https://example.com/image.jpg'],
          visibility: 'PUBLIC'
        }

        const result = schemas.createPost(postData)
        expect(result.isValid).toBe(true)
        expect(result.sanitizedData.content).toBe(postData.content)
      })

      it('should reject invalid post data', () => {
        const postData = {
          content: '', // empty content
          mediaUrls: new Array(11).fill('https://example.com/image.jpg') // too many URLs
        }

        const result = schemas.createPost(postData)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.includes('content'))).toBe(true)
        expect(result.errors.some(e => e.includes('mediaUrls'))).toBe(true)
      })

      it('should set default values', () => {
        const postData = {
          content: 'Simple post'
        }

        const result = schemas.createPost(postData)
        expect(result.isValid).toBe(true)
        expect(result.sanitizedData.contentType).toBe('TEXT')
        expect(result.sanitizedData.mediaUrls).toEqual([])
        expect(result.sanitizedData.visibility).toBe('PUBLIC')
      })
    })

    describe('createComment schema', () => {
      it('should validate comment data', () => {
        const commentData = {
          content: 'This is a valid comment'
        }

        const result = schemas.createComment(commentData)
        expect(result.isValid).toBe(true)
        expect(result.sanitizedData.content).toBe(commentData.content)
      })

      it('should reject long comments', () => {
        const commentData = {
          content: 'a'.repeat(501) // exceeds 500 character limit
        }

        const result = schemas.createComment(commentData)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.includes('500 characters'))).toBe(true)
      })
    })

    describe('createCommunity schema', () => {
      it('should validate community data', () => {
        const communityData = {
          name: 'test-community',
          displayName: 'Test Community',
          description: 'A test community for validation',
          category: 'general',
          tags: ['test', 'community']
        }

        const result = schemas.createCommunity(communityData)
        expect(result.isValid).toBe(true)
        expect(result.sanitizedData.name).toBe(communityData.name)
      })

      it('should reject invalid community names', () => {
        const communityData = {
          name: 'test community', // spaces not allowed
          displayName: 'Test Community',
          description: 'A test community',
          category: 'general'
        }

        const result = schemas.createCommunity(communityData)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.includes('name format'))).toBe(true)
      })
    })

    describe('updateProfile schema', () => {
      it('should validate profile updates', () => {
        const profileData = {
          username: 'newusername',
          displayName: 'New Display Name',
          bio: 'This is my updated bio',
          interests: ['coding', 'blockchain', 'penguins']
        }

        const result = schemas.updateProfile(profileData)
        expect(result.isValid).toBe(true)
        expect(result.sanitizedData.username).toBe(profileData.username)
      })

      it('should handle optional fields', () => {
        const profileData = {
          displayName: 'Just Display Name'
        }

        const result = schemas.updateProfile(profileData)
        expect(result.isValid).toBe(true)
        expect(result.sanitizedData.displayName).toBe(profileData.displayName)
        expect(result.sanitizedData.username).toBe(null)
      })
    })
  })
})