const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { walletAddress: '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02' }
    });

    if (!adminUser) {
      console.error('Admin user not found!');
      return;
    }

    console.log('Admin user ID:', adminUser.id);

    // Create test users
    const testUsers = [
      {
        walletAddress: '0x1111111111111111111111111111111111111111',
        displayName: 'Alice Penguin',
        username: 'alice_pengu',
        bio: 'Love building on Abstract! Web3 enthusiast 🚀',
        level: 5
      },
      {
        walletAddress: '0x2222222222222222222222222222222222222222',
        displayName: 'Bob Builder',
        username: 'bob_builds',
        bio: 'Full-stack dev | Building the future of social 🐧',
        level: 7
      },
      {
        walletAddress: '0x3333333333333333333333333333333333333333',
        displayName: 'Carol Crypto',
        username: 'carol_crypto',
        bio: 'DeFi trader | NFT collector | Pengu maximalist 💎',
        level: 3
      },
      {
        walletAddress: '0x4444444444444444444444444444444444444444',
        displayName: 'Dave Developer',
        username: 'dave_dev',
        bio: 'Smart contract security researcher 🔒',
        level: 10
      }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      const user = await prisma.user.upsert({
        where: { walletAddress: userData.walletAddress },
        update: userData,
        create: userData,
        include: { profile: true }
      });

      // Create profile if doesn't exist
      if (!user.profile) {
        await prisma.profile.create({
          data: {
            userId: user.id,
            interests: JSON.stringify(['Web3', 'NFTs', 'DeFi'])
          }
        });
      }

      createdUsers.push(user);
      console.log('✓ Created/Updated user:', user.username, '(' + user.id.slice(0, 8) + '...)');
    }

    console.log('\n📝 Creating posts...');

    // Create posts for each user
    const posts = [
      {
        authorId: createdUsers[0].id,
        content: 'Just deployed my first smart contract on Abstract! The developer experience is amazing 🚀 #Web3 #Abstract',
        visibility: 'PUBLIC'
      },
      {
        authorId: createdUsers[1].id,
        content: 'Working on a new DeFi protocol. Anyone interested in testing? DM me! 💰',
        visibility: 'PUBLIC'
      },
      {
        authorId: createdUsers[2].id,
        content: 'GM penguins! Today is a great day to build on Web3 🐧☀️',
        visibility: 'PUBLIC'
      },
      {
        authorId: createdUsers[3].id,
        content: 'Security tip: Always verify contract addresses before interacting. Stay safe out there! 🔒',
        visibility: 'PUBLIC'
      },
      {
        authorId: createdUsers[0].id,
        content: 'PeBloq is the future of decentralized social media. Love the community here! ❤️',
        visibility: 'PUBLIC'
      }
    ];

    for (const postData of posts) {
      const post = await prisma.post.create({
        data: postData,
        include: { author: true }
      });
      console.log('✓ Created post by', post.author.username);
    }

    console.log('\n🏘️ Creating community...');

    // Create a community
    const community = await prisma.community.upsert({
      where: { name: 'Abstract Builders' },
      update: {},
      create: {
        name: 'Abstract Builders',
        displayName: 'Abstract Builders',
        description: 'A community for developers building on Abstract blockchain. Share your projects, ask questions, and collaborate!',
        creatorId: createdUsers[1].id, // Bob creates the community
        visibility: 'PUBLIC',
        category: 'TECHNOLOGY'
      }
    });

    console.log('✓ Created community:', community.name, '(' + community.id.slice(0, 8) + '...)');

    // Add some members to the community (skip if already exist)
    try {
      await prisma.communityMember.createMany({
        data: [
          { communityId: community.id, userId: createdUsers[1].id, role: 'OWNER' },
          { communityId: community.id, userId: createdUsers[0].id, role: 'MEMBER' },
          { communityId: community.id, userId: createdUsers[3].id, role: 'MEMBER' }
        ],
        skipDuplicates: true
      });
      console.log('✓ Added members to community');
    } catch (e) {
      console.log('✓ Community members already exist');
    }

    console.log('\n💬 Creating DM conversation...');

    // Create a DM conversation between Carol and admin
    const conversation = await prisma.conversation.create({
      data: {
        participants: JSON.stringify([createdUsers[2].id, adminUser.id]),
        isGroup: false,
        lastMessage: 'Hey! I saw you\'re an admin on PeBloq...',
        lastMessageAt: new Date()
      }
    });

    console.log('✓ Created conversation:', conversation.id.slice(0, 8) + '...');

    // Carol sends you a message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: createdUsers[2].id,
        content: 'Hey! I saw you\'re an admin on PeBloq. Loving the platform so far! Do you have any tips for getting more engagement on my posts? 🐧',
        messageType: 'TEXT'
      }
    });

    console.log('✓ Carol sent you a DM!');

    console.log('\n✅ Test data created successfully!');
    console.log('\nSummary:');
    console.log('- 4 test users created');
    console.log('- 5 posts created');
    console.log('- 1 community created (Abstract Builders)');
    console.log('- 1 DM conversation with Carol Crypto');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
