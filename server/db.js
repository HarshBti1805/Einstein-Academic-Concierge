import { createRequire } from "module";
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
