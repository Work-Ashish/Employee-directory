"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var client_1 = require("@prisma/client");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var prisma = new client_1.PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres.awvmgzguqwbowxmakxad:Developers%40sourceone.ai@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres" // explicit URL as fallback
});
function main() {
    return __awaiter(this, void 0, void 0, function () {
        // ── Departments ─────────────────────────────────────────
        function upsertDept(name, color) {
            return __awaiter(this, void 0, void 0, function () {
                var existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma.department.findFirst({
                                where: { name: name, organizationId: organizationId }
                            })];
                        case 1:
                            existing = _a.sent();
                            if (existing)
                                return [2 /*return*/, existing];
                            return [2 /*return*/, prisma.department.create({
                                    data: { name: name, color: color, organizationId: organizationId }
                                })];
                    }
                });
            });
        }
        var org, organizationId, engineering, sales, marketing, finance, hr, hashedPassword, adminUser, employees, _i, employees_1, emp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🌱 Seeding database...");
                    return [4 /*yield*/, prisma.organization.upsert({
                            where: { domain: "emspro.com" },
                            update: {},
                            create: {
                                name: "EMS Pro Default",
                                domain: "emspro.com",
                            }
                        })];
                case 1:
                    org = _a.sent();
                    organizationId = org.id;
                    console.log("\u2705 Organization created: ".concat(org.name));
                    return [4 /*yield*/, upsertDept("Engineering", "#007aff")];
                case 2:
                    engineering = _a.sent();
                    return [4 /*yield*/, upsertDept("Sales", "#38bdf8")];
                case 3:
                    sales = _a.sent();
                    return [4 /*yield*/, upsertDept("Marketing", "#ec4899")];
                case 4:
                    marketing = _a.sent();
                    return [4 /*yield*/, upsertDept("Finance", "#f59e0b")];
                case 5:
                    finance = _a.sent();
                    return [4 /*yield*/, upsertDept("HR", "#10b981")];
                case 6:
                    hr = _a.sent();
                    console.log("✅ Departments seeded");
                    return [4 /*yield*/, bcryptjs_1.default.hash("admin123", 12)];
                case 7:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "admin@emspro.com" },
                            update: { organizationId: organizationId },
                            create: {
                                name: "Admin User",
                                email: "admin@emspro.com",
                                hashedPassword: hashedPassword,
                                role: "CEO",
                                avatar: "AU",
                                organizationId: organizationId
                            },
                        })];
                case 8:
                    adminUser = _a.sent();
                    console.log("✅ Admin user seeded (admin@emspro.com / admin123)");
                    employees = [
                        { code: "EMP001", first: "John", last: "Doe", email: "john@emspro.com", designation: "Sr. Software Engineer", dept: engineering.id, salary: 9500 },
                        { code: "EMP002", first: "Jane", last: "Smith", email: "jane@emspro.com", designation: "QA Engineer", dept: engineering.id, salary: 7000 },
                        { code: "EMP003", first: "Emily", last: "Brown", email: "emily@emspro.com", designation: "HR Director", dept: hr.id, salary: 8500 },
                        { code: "EMP004", first: "Michael", last: "Johnson", email: "michael@emspro.com", designation: "Sales Representative", dept: sales.id, salary: 6000 },
                        { code: "EMP005", first: "Lisa", last: "Anderson", email: "lisa@emspro.com", designation: "Content Strategist", dept: marketing.id, salary: 6500 },
                        { code: "EMP006", first: "David", last: "Wilson", email: "david@emspro.com", designation: "Financial Analyst", dept: finance.id, salary: 7500 },
                        { code: "EMP007", first: "Sarah", last: "Davis", email: "sarah@emspro.com", designation: "CTO", dept: engineering.id, salary: 12000 },
                        { code: "EMP008", first: "James", last: "Taylor", email: "james@emspro.com", designation: "DevOps Engineer", dept: engineering.id, salary: 8000 },
                        { code: "EMP009", first: "Amanda", last: "Thomas", email: "amanda@emspro.com", designation: "Sales Director", dept: sales.id, salary: 9000 },
                        { code: "EMP10", first: "Robert", last: "Garcia", email: "robert@emspro.com", designation: "Marketing Manager", dept: marketing.id, salary: 7000 },
                    ];
                    _i = 0, employees_1 = employees;
                    _a.label = 9;
                case 9:
                    if (!(_i < employees_1.length)) return [3 /*break*/, 12];
                    emp = employees_1[_i];
                    return [4 /*yield*/, prisma.employee.upsert({
                            where: { employeeCode: emp.code },
                            update: { organizationId: organizationId },
                            create: {
                                employeeCode: emp.code,
                                firstName: emp.first,
                                lastName: emp.last,
                                email: emp.email,
                                designation: emp.designation,
                                departmentId: emp.dept,
                                dateOfJoining: new Date("2024-01-15"),
                                salary: emp.salary,
                                status: "ACTIVE",
                                organizationId: organizationId
                            },
                        })];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 9];
                case 12:
                    console.log("✅ 10 Employees seeded");
                    console.log("\n🎉 Database seeding complete!");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
