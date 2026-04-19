import { PrismaClient } from '@prisma/client';
import { CategoryMatcherService } from './src/services/categoryMatcherService';
import process from 'process';

const prisma = new PrismaClient();

async function run() {
    // Find a profile
    const profile = await prisma.profile.findFirst();
    if (!profile) {
        console.log("No profile found");
        process.exit();
    }

    console.log("Testing matcher for profile:", profile.name, profile.id);

    // Create a dummy uncategorized transaction if needed or just run
    const matches = await CategoryMatcherService.matchTransactions(profile.id);
    console.log("Result:", matches);

    // Check keyword categories
    const cats = await prisma.transactionCategory.findMany({
        where: { profileId: profile.id }
    });
    console.log("Profile Categories:", cats.length);
    cats.forEach(c => {
        if (c.keywords && c.keywords.length > 0) {
            console.log(`- ${c.name} (${c.type}): ${c.keywords.join(', ')}`);
        }
    });

    process.exit();
}

run();
