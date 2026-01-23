require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const item = await prisma.item.findUnique({
            where: { id: "128344d5-0874-4f55-922e-12356ebeeb96" }
        });
        console.log("ITEM CHECK:", JSON.stringify(item, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
