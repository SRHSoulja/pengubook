const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndFix() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { walletAddress: '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02' },
        { displayName: { contains: 'arson', mode: 'insensitive' } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Users found:', users.length);

  for (const user of users) {
    console.log(`${user.displayName}: ${user.walletAddress ? 'WALLET ✅' : 'DUPLICATE ❌'}`);
    if (user.twitterAvatar) {
      console.log(`  Avatar: ${user.twitterAvatar.includes('_400x400') ? 'SHARP ✅' : 'BLURRY ❌'}`);
    }
  }

  // Delete duplicates
  const dup = users.find(u => !u.walletAddress);
  if (dup) {
    await prisma.user.delete({ where: { id: dup.id } });
    console.log('\n✅ Deleted duplicate');
  }

  // Fix avatar
  await prisma.user.update({
    where: { walletAddress: '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02' },
    data: {
      twitterAvatar: 'https://pbs.twimg.com/profile_images/1941960309033353216/GuXD6_JC_400x400.jpg',
      avatar: 'https://pbs.twimg.com/profile_images/1941960309033353216/GuXD6_JC_400x400.jpg'
    }
  });
  console.log('✅ Avatar fixed to 400x400\n');

  await prisma.$disconnect();
}

checkAndFix();
