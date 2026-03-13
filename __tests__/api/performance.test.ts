import { expect, test, describe, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/performance/route'
import { prismaMock, mockSession, mockSessionPersistent } from '../setup'
import { Roles } from '@/lib/permissions'
import { performanceReviewSchema } from '@/lib/schemas'

// ─── Test data factories ───────────────────────────────────

const ORG_ID = 'org-1'
const EMPLOYEE_ID = 'emp-001'
const REVIEWER_ID = 'emp-lead-001'

function makeEmployee(id: string, overrides = {}) {
    return {
        id,
        firstName: 'Test',
        lastName: `User-${id.slice(-3)}`,
        designation: 'Software Engineer',
        department: { name: 'Engineering' },
        ...overrides,
    }
}

function makeReviewer(id: string) {
    return { id, firstName: 'Lead', lastName: `User-${id.slice(-3)}` }
}

function makeReview(overrides = {}) {
    return {
        id: `rev-${Date.now()}`,
        rating: 4,
        progress: 80,
        comments: null,
        reviewDate: new Date(),
        status: 'COMPLETED',
        employeeId: EMPLOYEE_ID,
        organizationId: ORG_ID,
        reviewerId: REVIEWER_ID,
        reviewType: 'MANAGER',
        reviewPeriod: '2026-03',
        formType: 'DAILY',
        formData: {},
        employee: makeEmployee(EMPLOYEE_ID),
        reviewer: makeReviewer(REVIEWER_ID),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    }
}

// ─── Daily form data ────────────────────────────────────────

const DAILY_FORM_DATA = {
    metrics: [
        { name: 'Submittals', target: '10', actual: '12', notes: 'Above target' },
        { name: 'Interviews', target: '5', actual: '5', notes: 'On target' },
        { name: 'Offers', target: '2', actual: '3', notes: 'Exceeded' },
    ],
    competencies: [
        { name: 'Communication', rating: 4, notes: 'Great client rapport' },
        { name: 'Technical Skills', rating: 5, notes: 'Deep domain knowledge' },
        { name: 'Time Management', rating: 3, notes: 'Needs improvement on deadlines' },
    ],
    overallRating: 4,
    strengths: 'Strong technical knowledge and excellent client communication',
    areasOfImprovement: 'Time management and documentation',
    actionPlan: 'Implement daily task tracking, weekly reviews with manager',
    managerComments: 'Solid performer, needs to work on timeliness',
}

// ─── Monthly form data ──────────────────────────────────────

const MONTHLY_FORM_DATA = {
    kpis: [
        { name: 'Total Hires', target: '20', actual: '22', achievement: '110%', trend: '↑' },
        { name: 'Time to Fill', target: '30 days', actual: '25 days', achievement: '117%', trend: '↑' },
        { name: 'Offer Acceptance', target: '85%', actual: '90%', achievement: '106%', trend: '→' },
        { name: 'Pipeline Added', target: '50', actual: '55', achievement: '110%', trend: '↑' },
        { name: 'Quality of Hire', target: '4.0', actual: '4.2', achievement: '105%', trend: '↑' },
    ],
    competencies: [
        { name: 'Leadership', rating: 4, notes: 'Led team through key deadline' },
        { name: 'Strategic Thinking', rating: 3, notes: 'Good but could be more proactive' },
        { name: 'Communication', rating: 5, notes: 'Excellent stakeholder management' },
        { name: 'Decision Making', rating: 4, notes: 'Sound judgment in hiring calls' },
    ],
    overallRating: 4,
    strengths: 'Leadership and stakeholder management are standout qualities',
    areasOfImprovement: 'Strategic planning and proactive risk identification',
    goalsNextMonth: ['Close 25 hires', 'Reduce TTF to 22 days', 'Launch new sourcing channel'],
    managerComments: 'Excellent month, keep pushing on strategic initiatives',
}

// ─── Team Review form data ──────────────────────────────────

function makeTeamReviewFormData(employeeId: string) {
    return {
        employeeId,
        employeeName: 'Test Member',
        employeeRole: 'Recruiter',
        kpis: [
            { metric: 'Hires Made', target: '8', actual: '10', notes: 'Exceeded target' },
            { metric: 'Submittals', target: '30', actual: '35', notes: 'Strong pipeline' },
            { metric: 'Interviews Facilitated', target: '15', actual: '18', notes: '' },
            { metric: 'Offers Extended', target: '5', actual: '6', notes: '' },
            { metric: 'Pipeline Added', target: '40', actual: '45', notes: '' },
        ],
        competencies: [
            { name: 'Pipeline Quality & Sourcing', rating: 4, notes: 'Good sourcing strategies' },
            { name: 'Candidate Communication', rating: 5, notes: 'Excellent rapport' },
            { name: 'HM Partnership', rating: 4, notes: 'Strong collaboration' },
            { name: 'Offer Conversion', rating: 3, notes: 'Room for improvement' },
            { name: 'Process & Compliance', rating: 4, notes: 'Follows all guidelines' },
        ],
        strengths: 'Excellent candidate sourcing and communication skills',
        gaps: 'Needs to improve offer conversion rate',
        actionPlan: 'Focus on negotiation training and offer packaging',
        overallRating: 4,
        config: {
            kpiNames: ['Hires Made', 'Submittals', 'Interviews Facilitated', 'Offers Extended', 'Pipeline Added'],
            competencyNames: ['Pipeline Quality & Sourcing', 'Candidate Communication', 'HM Partnership', 'Offer Conversion', 'Process & Compliance'],
        },
    }
}

// ─── Leader Monthly Self-Review form data ───────────────────

const LEADER_MONTHLY_FORM_DATA = {
    // Section 1: Leader Information
    leaderName: 'John Lead',
    titleLevel: 'Senior Team Lead / L5',
    department: 'Recruitment',
    businessUnit: 'Technology',
    directManager: 'VP of Talent',
    reviewMonthYear: 'March 2026',
    totalTeamMembers: '8',
    reviewDate: '2026-03-13',

    // Section 2: Team Composition
    teamComposition: {
        totalRecruiters: '8',
        fullyRamped: '5',
        inRampUp: '2',
        onPipWatch: '1',
        highPerformers: '3',
        openHcSlots: '1',
    },
    teamMembers: [
        { name: 'Alice', role: 'Senior Recruiter', hires: '10', ttf: '22', oar: '92%', submittals: '35', rating: '4.5', status: 'Active' },
        { name: 'Bob', role: 'Recruiter', hires: '7', ttf: '28', oar: '85%', submittals: '30', rating: '3.8', status: 'Active' },
        { name: 'Carol', role: 'Junior Recruiter', hires: '4', ttf: '35', oar: '78%', submittals: '20', rating: '3.0', status: 'Ramp-Up' },
        { name: 'Dave', role: 'Recruiter', hires: '3', ttf: '40', oar: '70%', submittals: '15', rating: '2.5', status: 'PIP' },
    ],

    // Section 3: KPI Scorecard
    kpis: [
        { metric: 'Total Hires', monthlyTarget: '40', teamActual: '34', achievement: '85%', perRecruiterAvg: '4.25', trend: '↑' },
        { metric: 'Time to Fill', monthlyTarget: '25', teamActual: '28', achievement: '89%', perRecruiterAvg: '28', trend: '→' },
        { metric: 'Offer Acceptance Rate', monthlyTarget: '90%', teamActual: '87%', achievement: '97%', perRecruiterAvg: '87%', trend: '↓' },
        { metric: 'Submittals', monthlyTarget: '200', teamActual: '210', achievement: '105%', perRecruiterAvg: '26.25', trend: '↑' },
        { metric: 'Pipeline Added', monthlyTarget: '300', teamActual: '280', achievement: '93%', perRecruiterAvg: '35', trend: '→' },
    ],

    // Section 4: Leadership Competencies
    competencies: [
        { name: 'Team Development & Coaching', rating: 4, evidence: 'Conducted weekly 1:1s, mentored 2 junior recruiters' },
        { name: 'Performance Management', rating: 4, evidence: 'Successfully managed PIP for one recruiter' },
        { name: 'Strategic Planning', rating: 3, evidence: 'Contributed to Q2 hiring plan' },
        { name: 'Stakeholder Management', rating: 5, evidence: 'Built strong HM relationships across 3 BUs' },
        { name: 'Process Improvement', rating: 4, evidence: 'Reduced candidate drop-off by 15%' },
        { name: 'Data-Driven Decision Making', rating: 3, evidence: 'Started using analytics dashboard' },
    ],
    weightedAvgScore: '3.8',

    // Section 5: Overall Rating
    overallRating: 4,

    // Section 6: Team Health
    teamHealth: {
        engagement: 'Team morale is high. Regular team bonding activities conducted.',
        atRisk: 'Dave is currently on PIP. Weekly check-ins in progress.',
        escalations: 'One escalation from hiring manager regarding candidate quality — resolved.',
        attrition: 'Zero attrition this month. One team member exploring internal transfer.',
        headcountGaps: 'One open headcount — sourcing in progress, 3 candidates in pipeline.',
        trainingNeeds: 'Advanced sourcing techniques training needed for junior recruiters.',
    },

    // Section 7: Goals & Development
    accomplishments: 'Hit 85% of hiring target in a challenging market. Reduced TTF by 3 days from previous month.',
    areasForImprovement: 'Need to improve offer acceptance rate and reduce early-stage pipeline drop-off.',
    goalsNextMonth: [
        'Close all 40 hires (100% target achievement)',
        'Reduce TTF to 25 days',
        'Launch sourcing bootcamp for junior recruiters',
    ],
    devTrainingPlan: 'Enroll in leadership program. Complete stakeholder management workshop.',

    // Section 8: Feedback
    seniorManagerComments: 'Strong leadership this month. Focus on strategic hiring for Q2.',
    leaderSelfAssessment: 'I feel the team is on track. Main challenge is the PIP situation with Dave.',
    agreedActionItems: 'Implement structured sourcing training. Weekly pipeline review meetings.',

    // Section 9: Signatures
    signatures: {
        leader: { name: 'John Lead', date: '2026-03-13' },
        director: { name: 'VP of Talent', date: '2026-03-14' },
        hrPartner: { name: 'HR Business Partner', date: '2026-03-14' },
    },
}


describe('Performance Review API Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Setup default employee resolution for withAuth
        prismaMock.employee.findFirst.mockResolvedValue({ id: EMPLOYEE_ID })
    })

    // ═══════════════════════════════════════════════════════════
    // GET /api/performance
    // ═══════════════════════════════════════════════════════════

    describe('GET /api/performance', () => {
        test('CEO can list all reviews in organization', async () => {
            const reviews = [
                makeReview({ id: 'rev-1', formType: 'DAILY' }),
                makeReview({ id: 'rev-2', formType: 'MONTHLY' }),
                makeReview({ id: 'rev-3', formType: 'TEAM_REVIEW' }),
                makeReview({ id: 'rev-4', formType: 'LEADER_MONTHLY' }),
            ]
            prismaMock.performanceReview = {
                findMany: vi.fn().mockResolvedValue(reviews),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance')
            const res = await GET(req)
            const json = await res.json()

            expect(res.status).toBe(200)
            expect(json.data.length).toBe(4)
        })

        test('CEO can filter reviews by formType', async () => {
            const reviews = [makeReview({ formType: 'TEAM_REVIEW' })]
            prismaMock.performanceReview = {
                findMany: vi.fn().mockResolvedValue(reviews),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance?formType=TEAM_REVIEW')
            const res = await GET(req)
            const json = await res.json()

            expect(res.status).toBe(200)
            expect(json.data.length).toBe(1)
            expect(json.data[0].formType).toBe('TEAM_REVIEW')
        })

        test('CEO can filter reviews by employeeId', async () => {
            const reviews = [makeReview({ employeeId: 'emp-specific' })]
            prismaMock.performanceReview = {
                findMany: vi.fn().mockResolvedValue(reviews),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance?employeeId=emp-specific')
            const res = await GET(req)
            const json = await res.json()

            expect(res.status).toBe(200)
            expect(json.data[0].employeeId).toBe('emp-specific')
        })

        test('TEAM_LEAD only sees reviews they created or about them', async () => {
            mockSession({ role: Roles.TEAM_LEAD })
            prismaMock.performanceReview = {
                findMany: vi.fn().mockResolvedValue([]),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance')
            const res = await GET(req)

            expect(res.status).toBe(200)
            // Verify the where clause includes OR condition
            const callArgs = (prismaMock.performanceReview as any).findMany.mock.calls[0][0]
            expect(callArgs.where.OR).toBeDefined()
        })

        test('EMPLOYEE only sees their own reviews', async () => {
            mockSession({ role: Roles.EMPLOYEE })
            prismaMock.performanceReview = {
                findMany: vi.fn().mockResolvedValue([]),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance')
            const res = await GET(req)

            expect(res.status).toBe(200)
            const callArgs = (prismaMock.performanceReview as any).findMany.mock.calls[0][0]
            expect(callArgs.where.employeeId).toBe(EMPLOYEE_ID)
        })

        test('handles database errors gracefully', async () => {
            prismaMock.performanceReview = {
                findMany: vi.fn().mockRejectedValue(new Error('DB connection lost')),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance')
            const res = await GET(req)
            const json = await res.json()

            expect(res.status).toBe(500)
            expect(json.error.message).toBe('Internal Server Error')
        })
    })

    // ═══════════════════════════════════════════════════════════
    // POST /api/performance — DAILY form
    // ═══════════════════════════════════════════════════════════

    describe('POST /api/performance — DAILY form', () => {
        beforeEach(() => {
            // TEAM_LEAD has PERFORMANCE:CREATE permission
            mockSessionPersistent({ role: Roles.TEAM_LEAD })
        })

        test('creates a daily review successfully', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'DAILY',
                reviewType: 'MANAGER',
                formData: DAILY_FORM_DATA,
                reviewPeriod: '2026-03-13',
            }
            const created = makeReview({ ...payload, id: 'rev-daily-1' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)
            const json = await res.json()

            expect(res.status).toBe(201)
            expect(json.data.formType).toBe('DAILY')
            expect((prismaMock.performanceReview as any).create).toHaveBeenCalledTimes(1)
        })

        test('daily review with all metrics and competencies', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 5,
                formType: 'DAILY',
                reviewType: 'MANAGER',
                formData: {
                    ...DAILY_FORM_DATA,
                    metrics: Array.from({ length: 10 }, (_, i) => ({
                        name: `Metric-${i + 1}`,
                        target: `${(i + 1) * 5}`,
                        actual: `${(i + 1) * 5 + 2}`,
                        notes: `Note for metric ${i + 1}`,
                    })),
                    competencies: Array.from({ length: 8 }, (_, i) => ({
                        name: `Competency-${i + 1}`,
                        rating: (i % 5) + 1,
                        notes: `Competency note ${i + 1}`,
                    })),
                },
            }
            const created = makeReview({ ...payload, id: 'rev-daily-stress-1' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
        })

        test('daily self-review (reviewType=SELF)', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 3,
                formType: 'DAILY',
                reviewType: 'SELF',
                formData: { ...DAILY_FORM_DATA, overallRating: 3 },
            }
            const created = makeReview({ ...payload, id: 'rev-daily-self-1' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
            const json = await res.json()
            expect(json.data.reviewType).toBe('SELF')
        })
    })

    // ═══════════════════════════════════════════════════════════
    // POST /api/performance — MONTHLY form
    // ═══════════════════════════════════════════════════════════

    describe('POST /api/performance — MONTHLY form', () => {
        beforeEach(() => {
            mockSessionPersistent({ role: Roles.TEAM_LEAD })
        })

        test('creates a monthly review successfully', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'MONTHLY',
                reviewType: 'MANAGER',
                formData: MONTHLY_FORM_DATA,
                reviewPeriod: '2026-03',
            }
            const created = makeReview({ ...payload, id: 'rev-monthly-1' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)
            const json = await res.json()

            expect(res.status).toBe(201)
            expect(json.data.formType).toBe('MONTHLY')
        })

        test('monthly review with large KPI dataset (15+ KPIs)', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'MONTHLY',
                reviewType: 'MANAGER',
                formData: {
                    ...MONTHLY_FORM_DATA,
                    kpis: Array.from({ length: 15 }, (_, i) => ({
                        name: `KPI-${i + 1}`,
                        target: `${100 + i * 10}`,
                        actual: `${95 + i * 10}`,
                        achievement: `${90 + i}%`,
                        trend: i % 3 === 0 ? '↑' : i % 3 === 1 ? '→' : '↓',
                    })),
                },
            }
            const created = makeReview({ ...payload, id: 'rev-monthly-stress' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
        })

        test('monthly self-review (SELF type)', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'MONTHLY',
                reviewType: 'SELF',
                formData: MONTHLY_FORM_DATA,
                reviewPeriod: '2026-03',
            }
            const created = makeReview({ ...payload, id: 'rev-monthly-self' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
        })
    })

    // ═══════════════════════════════════════════════════════════
    // POST /api/performance — TEAM_REVIEW form
    // ═══════════════════════════════════════════════════════════

    describe('POST /api/performance — TEAM_REVIEW form', () => {
        beforeEach(() => {
            mockSessionPersistent({ role: Roles.TEAM_LEAD })
        })

        test('creates a team review for a single member', async () => {
            const payload = {
                employeeId: 'emp-member-001',
                rating: 4,
                formType: 'TEAM_REVIEW',
                reviewType: 'MANAGER',
                formData: makeTeamReviewFormData('emp-member-001'),
            }
            const created = makeReview({ ...payload, id: 'rev-team-1' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)
            const json = await res.json()

            expect(res.status).toBe(201)
            expect(json.data.formType).toBe('TEAM_REVIEW')
        })

        test('stress: batch team review for 10 members (sequential)', async () => {
            const memberIds = Array.from({ length: 10 }, (_, i) => `emp-member-${String(i + 1).padStart(3, '0')}`)
            const results: number[] = []

            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockImplementation((args) =>
                    Promise.resolve(makeReview({
                        id: `rev-team-batch-${Date.now()}`,
                        ...args.data,
                    }))
                ),
            } as any

            for (const memberId of memberIds) {
                const payload = {
                    employeeId: memberId,
                    rating: Math.floor(Math.random() * 5) + 1,
                    formType: 'TEAM_REVIEW',
                    reviewType: 'MANAGER',
                    formData: makeTeamReviewFormData(memberId),
                }
                const req = new Request('http://localhost:3000/api/performance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                const res = await POST(req)
                results.push(res.status)
            }

            // All 10 should succeed
            expect(results).toHaveLength(10)
            expect(results.every(s => s === 201)).toBe(true)
            expect((prismaMock.performanceReview as any).create).toHaveBeenCalledTimes(10)
        })

        test('team review with custom config (renamed KPIs/competencies)', async () => {
            const customFormData = makeTeamReviewFormData('emp-custom-001')
            customFormData.config = {
                kpiNames: ['Custom KPI A', 'Custom KPI B', 'Custom KPI C'],
                competencyNames: ['Custom Comp X', 'Custom Comp Y', 'Custom Comp Z'],
            }
            customFormData.kpis = [
                { metric: 'Custom KPI A', target: '100', actual: '120', notes: '' },
                { metric: 'Custom KPI B', target: '50', actual: '45', notes: '' },
                { metric: 'Custom KPI C', target: '75', actual: '80', notes: '' },
            ]

            const payload = {
                employeeId: 'emp-custom-001',
                rating: 4,
                formType: 'TEAM_REVIEW',
                reviewType: 'MANAGER',
                formData: customFormData,
            }
            const created = makeReview({ ...payload, id: 'rev-team-custom' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
        })
    })

    // ═══════════════════════════════════════════════════════════
    // POST /api/performance — LEADER_MONTHLY form
    // ═══════════════════════════════════════════════════════════

    describe('POST /api/performance — LEADER_MONTHLY form', () => {
        beforeEach(() => {
            mockSessionPersistent({ role: Roles.TEAM_LEAD })
        })

        test('creates a leader monthly self-review successfully', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'LEADER_MONTHLY',
                reviewType: 'SELF',
                formData: LEADER_MONTHLY_FORM_DATA,
                reviewPeriod: '2026-03',
            }
            const created = makeReview({ ...payload, id: 'rev-leader-1' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)
            const json = await res.json()

            expect(res.status).toBe(201)
            expect(json.data.formType).toBe('LEADER_MONTHLY')
        })

        test('leader monthly with full 9-section data', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'LEADER_MONTHLY',
                reviewType: 'SELF',
                formData: LEADER_MONTHLY_FORM_DATA,
                reviewPeriod: '2026-03',
            }
            const created = makeReview({ ...payload, id: 'rev-leader-full' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)

            // Verify the Prisma create was called with correct structure
            const createArgs = (prismaMock.performanceReview as any).create.mock.calls[0][0]
            expect(createArgs.data.formType).toBe('LEADER_MONTHLY')
            expect(createArgs.data.reviewType).toBe('SELF')
            expect(createArgs.data.formData).toBeDefined()
        })

        test('leader monthly with 20 team members (stress)', async () => {
            const bigTeamData = {
                ...LEADER_MONTHLY_FORM_DATA,
                totalTeamMembers: '20',
                teamComposition: { ...LEADER_MONTHLY_FORM_DATA.teamComposition, totalRecruiters: '20', fullyRamped: '12', inRampUp: '5', onPipWatch: '3' },
                teamMembers: Array.from({ length: 20 }, (_, i) => ({
                    name: `Team Member ${i + 1}`,
                    role: i % 3 === 0 ? 'Senior Recruiter' : i % 3 === 1 ? 'Recruiter' : 'Junior Recruiter',
                    hires: String(Math.floor(Math.random() * 15) + 1),
                    ttf: String(Math.floor(Math.random() * 20) + 20),
                    oar: `${Math.floor(Math.random() * 30) + 70}%`,
                    submittals: String(Math.floor(Math.random() * 30) + 10),
                    rating: (Math.random() * 2 + 3).toFixed(1),
                    status: i < 15 ? 'Active' : i < 18 ? 'Ramp-Up' : 'PIP',
                })),
                kpis: Array.from({ length: 14 }, (_, i) => ({
                    metric: `KPI Metric ${i + 1}`,
                    monthlyTarget: String(Math.floor(Math.random() * 100) + 50),
                    teamActual: String(Math.floor(Math.random() * 100) + 40),
                    achievement: `${Math.floor(Math.random() * 30) + 70}%`,
                    perRecruiterAvg: String((Math.random() * 10 + 5).toFixed(1)),
                    trend: ['↑', '→', '↓'][i % 3],
                })),
                competencies: Array.from({ length: 12 }, (_, i) => ({
                    name: `Leadership Competency ${i + 1}`,
                    rating: Math.floor(Math.random() * 5) + 1,
                    evidence: `Evidence for competency ${i + 1} demonstrating leadership capability`,
                })),
            }

            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'LEADER_MONTHLY',
                reviewType: 'SELF',
                formData: bigTeamData,
                reviewPeriod: '2026-03',
            }
            const created = makeReview({ ...payload, id: 'rev-leader-stress' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
        })
    })

    // ═══════════════════════════════════════════════════════════
    // Validation & Edge Cases
    // ═══════════════════════════════════════════════════════════

    describe('Validation & Edge Cases', () => {
        beforeEach(() => {
            mockSessionPersistent({ role: Roles.TEAM_LEAD })
        })

        test('rejects missing employeeId', async () => {
            const payload = {
                rating: 4,
                formType: 'DAILY',
                reviewType: 'MANAGER',
                formData: DAILY_FORM_DATA,
            }
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(400)
        })

        test('rejects invalid rating (> 5)', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 10,
                formType: 'DAILY',
                reviewType: 'MANAGER',
                formData: DAILY_FORM_DATA,
            }
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(400)
        })

        test('rejects invalid rating (< 0)', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: -1,
                formType: 'DAILY',
                reviewType: 'MANAGER',
                formData: DAILY_FORM_DATA,
            }
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(400)
        })

        test('rejects invalid formType', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'INVALID_TYPE',
                reviewType: 'MANAGER',
                formData: {},
            }
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(400)
        })

        test('rejects invalid reviewType', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'DAILY',
                reviewType: 'INVALID',
                formData: {},
            }
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn(),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(400)
        })

        test('accepts review with null formType (legacy)', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 3,
                comments: 'Legacy review without structured form',
            }
            const created = makeReview({ ...payload, formType: null, formData: null, id: 'rev-legacy' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
        })

        test('accepts review with null formData', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 3,
                formType: 'DAILY',
                reviewType: 'MANAGER',
                formData: null,
            }
            const created = makeReview({ ...payload, id: 'rev-null-data' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
        })

        test('accepts rating of 0', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 0,
                formType: 'DAILY',
                reviewType: 'MANAGER',
                formData: DAILY_FORM_DATA,
            }
            const created = makeReview({ ...payload, id: 'rev-zero-rating' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
        })

        test('accepts boundary rating of 5', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 5,
                formType: 'MONTHLY',
                reviewType: 'MANAGER',
                formData: MONTHLY_FORM_DATA,
            }
            const created = makeReview({ ...payload, id: 'rev-max-rating' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
        })

        test('handles very large formData (stress)', async () => {
            const largeFormData = {
                ...LEADER_MONTHLY_FORM_DATA,
                // Add long strings to stress test JSON serialization
                accomplishments: 'A'.repeat(5000),
                areasForImprovement: 'B'.repeat(5000),
                devTrainingPlan: 'C'.repeat(5000),
                seniorManagerComments: 'D'.repeat(5000),
                leaderSelfAssessment: 'E'.repeat(5000),
                agreedActionItems: 'F'.repeat(5000),
            }
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'LEADER_MONTHLY',
                reviewType: 'SELF',
                formData: largeFormData,
            }
            const created = makeReview({ ...payload, id: 'rev-large' })
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(201)
        })

        test('handles POST database error', async () => {
            const payload = {
                employeeId: EMPLOYEE_ID,
                rating: 4,
                formType: 'DAILY',
                reviewType: 'MANAGER',
                formData: DAILY_FORM_DATA,
            }
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockRejectedValue(new Error('Unique constraint violated')),
            } as any

            const req = new Request('http://localhost:3000/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const res = await POST(req)

            expect(res.status).toBe(500)
        })
    })

    // ═══════════════════════════════════════════════════════════
    // Stress: Rapid-fire concurrent submissions
    // ═══════════════════════════════════════════════════════════

    describe('Stress: Rapid-fire submissions', () => {
        beforeEach(() => {
            mockSessionPersistent({ role: Roles.TEAM_LEAD })
        })

        test('20 concurrent DAILY review submissions', async () => {
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockImplementation((args) =>
                    Promise.resolve(makeReview({ ...args.data, id: `rev-rapid-${Date.now()}-${Math.random()}` }))
                ),
            } as any

            const requests = Array.from({ length: 20 }, (_, i) => {
                const payload = {
                    employeeId: `emp-${String(i + 1).padStart(3, '0')}`,
                    rating: (i % 5) + 1,
                    formType: 'DAILY',
                    reviewType: 'MANAGER',
                    formData: { ...DAILY_FORM_DATA, overallRating: (i % 5) + 1 },
                }
                return new Request('http://localhost:3000/api/performance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            })

            const responses = await Promise.all(requests.map(r => POST(r)))
            const statuses = responses.map(r => r.status)

            expect(statuses.every(s => s === 201)).toBe(true)
            expect((prismaMock.performanceReview as any).create).toHaveBeenCalledTimes(20)
        })

        test('mixed form types concurrent (DAILY + MONTHLY + TEAM_REVIEW + LEADER_MONTHLY)', async () => {
            prismaMock.performanceReview = {
                findMany: vi.fn(),
                create: vi.fn().mockImplementation((args) =>
                    Promise.resolve(makeReview({ ...args.data, id: `rev-mixed-${Date.now()}-${Math.random()}` }))
                ),
            } as any

            const payloads = [
                // 5 Daily
                ...Array.from({ length: 5 }, (_, i) => ({
                    employeeId: `emp-d-${i}`, rating: 4, formType: 'DAILY', reviewType: 'MANAGER', formData: DAILY_FORM_DATA,
                })),
                // 5 Monthly
                ...Array.from({ length: 5 }, (_, i) => ({
                    employeeId: `emp-m-${i}`, rating: 3, formType: 'MONTHLY', reviewType: 'MANAGER', formData: MONTHLY_FORM_DATA,
                })),
                // 5 Team Review
                ...Array.from({ length: 5 }, (_, i) => ({
                    employeeId: `emp-t-${i}`, rating: 4, formType: 'TEAM_REVIEW', reviewType: 'MANAGER', formData: makeTeamReviewFormData(`emp-t-${i}`),
                })),
                // 5 Leader Monthly
                ...Array.from({ length: 5 }, (_, i) => ({
                    employeeId: `emp-l-${i}`, rating: 4, formType: 'LEADER_MONTHLY', reviewType: 'SELF', formData: LEADER_MONTHLY_FORM_DATA,
                })),
            ]

            const requests = payloads.map(p =>
                new Request('http://localhost:3000/api/performance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(p),
                })
            )

            const responses = await Promise.all(requests.map(r => POST(r)))
            const statuses = responses.map(r => r.status)

            expect(statuses).toHaveLength(20)
            expect(statuses.every(s => s === 201)).toBe(true)
            expect((prismaMock.performanceReview as any).create).toHaveBeenCalledTimes(20)
        })
    })

    // ═══════════════════════════════════════════════════════════
    // Schema Validation Unit Tests
    // ═══════════════════════════════════════════════════════════

    describe('Schema validation (performanceReviewSchema)', () => {

        test('validates all 4 formType values', () => {
            for (const formType of ['DAILY', 'MONTHLY', 'TEAM_REVIEW', 'LEADER_MONTHLY']) {
                const result = performanceReviewSchema.safeParse({
                    employeeId: 'emp-1',
                    rating: 4,
                    formType,
                    reviewType: 'MANAGER',
                })
                expect(result.success).toBe(true)
            }
        })

        test('validates all reviewType values', () => {
            for (const reviewType of ['MANAGER', 'SELF', 'PEER']) {
                const result = performanceReviewSchema.safeParse({
                    employeeId: 'emp-1',
                    rating: 4,
                    reviewType,
                })
                expect(result.success).toBe(true)
            }
        })

        test('rejects unknown formType', () => {
            const result = performanceReviewSchema.safeParse({
                employeeId: 'emp-1',
                rating: 4,
                formType: 'WEEKLY',
            })
            expect(result.success).toBe(false)
        })

        test('accepts null/undefined formType', () => {
            const result1 = performanceReviewSchema.safeParse({
                employeeId: 'emp-1',
                rating: 4,
                formType: null,
            })
            const result2 = performanceReviewSchema.safeParse({
                employeeId: 'emp-1',
                rating: 4,
            })
            expect(result1.success).toBe(true)
            expect(result2.success).toBe(true)
        })

        test('validates rating boundaries (0-5)', () => {
            const valid0 = performanceReviewSchema.safeParse({ employeeId: 'emp-1', rating: 0 })
            const valid5 = performanceReviewSchema.safeParse({ employeeId: 'emp-1', rating: 5 })
            const invalidNeg = performanceReviewSchema.safeParse({ employeeId: 'emp-1', rating: -1 })
            const invalid6 = performanceReviewSchema.safeParse({ employeeId: 'emp-1', rating: 6 })

            expect(valid0.success).toBe(true)
            expect(valid5.success).toBe(true)
            expect(invalidNeg.success).toBe(false)
            expect(invalid6.success).toBe(false)
        })

        test('requires employeeId', () => {
            const result = performanceReviewSchema.safeParse({ rating: 4 })
            expect(result.success).toBe(false)
        })

        test('rejects empty employeeId', () => {
            const result = performanceReviewSchema.safeParse({ employeeId: '', rating: 4 })
            expect(result.success).toBe(false)
        })

        test('coerces string rating to number', () => {
            const result = performanceReviewSchema.safeParse({
                employeeId: 'emp-1',
                rating: '4',
            })
            expect(result.success).toBe(true)
            expect(result.data?.rating).toBe(4)
        })

        test('validates all status values', () => {
            for (const status of ['PENDING', 'COMPLETED', 'EXCELLENT', 'GOOD', 'NEEDS_IMPROVEMENT']) {
                const result = performanceReviewSchema.safeParse({
                    employeeId: 'emp-1',
                    rating: 4,
                    status,
                })
                expect(result.success).toBe(true)
            }
        })

        test('accepts arbitrary formData as record', () => {
            const result = performanceReviewSchema.safeParse({
                employeeId: 'emp-1',
                rating: 4,
                formData: {
                    deepNested: { a: { b: { c: [1, 2, 3] } } },
                    array: [{ x: 1 }, { x: 2 }],
                    string: 'value',
                    number: 42,
                    boolean: true,
                },
            })
            expect(result.success).toBe(true)
        })
    })
})
