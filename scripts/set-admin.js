const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const ADMIN_WALLET_ADDRESS = '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02'

async function main() {
  try {
    // Find the admin wallet user
    const user = await prisma.user.findUnique({
      where: { walletAddress: ADMIN_WALLET_ADDRESS.toLowerCase() }
    })

    if (!user) {
      console.log('❌ Admin user not found for wallet:', ADMIN_WALLET_ADDRESS)
      console.log('\nTrying case-insensitive search...')
      
      const allUsers = await prisma.user.findMany({
        where: {
          walletAddress: {
            not: null
          }
        },
        select: {
          id: true,
          walletAddress: true,
          displayName: true,
          isAdmin: true
        }
      })

      const adminUser = allUsers.find(u => 
        u.walletAddress?.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase()
      )

      if (adminUser) {
        console.log('✅ Found admin user:', adminUser)
        
        if (adminUser.isAdmin) {
          console.log('✅ User already has admin privileges')
        } else {
          console.log('⚙️ Setting admin privileges...')
          await prisma.user.update({
            where: { id: adminUser.id },
            data: { isAdmin: true }
          })
          console.log('✅ Admin privileges set successfully!')
        }
      } else {
        console.log('\n📋 All wallet users:')
        allUsers.forEach(u => {
          console.log(`  - ${u.walletAddress} (${u.displayName}) - isAdmin: ${u.isAdmin}`)
        })
      }
    } else {
      if (user.isAdmin) {
        console.log('✅ User already has admin privileges')
      } else {
        console.log('⚙️ Setting admin privileges...')
        await prisma.user.update({
          where: { id: user.id },
          data: { isAdmin: true }
        })
        console.log('✅ Admin privileges set successfully!')
      }
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
