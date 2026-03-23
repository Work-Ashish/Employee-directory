/**
 * Load Test — Source One Performance Module
 *
 * Tests all Source One performance endpoints under concurrent load.
 * Auth: Django JWT via /api/v1/auth/login/ (or falls back to NextAuth cookie).
 *
 * Usage:
 *   node scripts/load_test_performance.js [--base http://localhost:3000] [--django http://localhost:8000] [--iterations 30] [--concurrency 5]
 */

const http = require('http');
const https = require('https');

// ── CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag, defaultVal) {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const BASE_URL = getArg('--base', 'http://localhost:3000');
const DJANGO_URL = getArg('--django', 'http://localhost:8000');
const ITERATIONS = parseInt(getArg('--iterations', '30'), 10);
const CONCURRENCY = parseInt(getArg('--concurrency', '5'), 10);

const parsedBase = new URL(BASE_URL);
const isHttps = parsedBase.protocol === 'https:';
const httpModule = isHttps ? https : http;

// ── HTTP helper ───────────────────────────────────────────────────────
function makeRequest(urlStr, method = 'GET', headers = {}, postData = null) {
    return new Promise((resolve) => {
        const url = new URL(urlStr);
        const start = performance.now();
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        };
        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
            let body = '';
            res.on('data', (d) => { body += d; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    duration: performance.now() - start,
                    headers: res.headers,
                    body,
                });
            });
        });

        req.on('error', (e) => {
            resolve({ statusCode: 0, error: e.message, duration: performance.now() - start });
        });

        req.setTimeout(30000, () => {
            req.destroy();
            resolve({ statusCode: 0, error: 'Timeout', duration: performance.now() - start });
        });

        if (postData) req.write(postData);
        req.end();
    });
}

// ── Auth ──────────────────────────────────────────────────────────────
async function getAuthToken() {
    console.log('Authenticating with Django...');

    // Try Django JWT login
    const loginData = JSON.stringify({
        email: 'loadtest@sourceone.com',
        password: 'LoadTest@2026',
        tenant_slug: 'sourceoneai',
    });

    const res = await makeRequest(
        `${DJANGO_URL}/api/v1/auth/login/`,
        'POST',
        { 'Content-Type': 'application/json', 'X-Tenant-Slug': 'sourceoneai' },
        loginData
    );

    if (res.statusCode === 200) {
        try {
            const data = JSON.parse(res.body);
            const token = data.data?.access || data.access || data.token;
            if (token) {
                console.log('Authenticated via Django JWT');
                return { type: 'jwt', token };
            }
        } catch { /* fall through */ }
    }

    // Fallback: try NextAuth session cookie
    console.log('Django login failed (status:', res.statusCode, '), trying NextAuth...');
    try {
        const csrfRes = await makeRequest(`${BASE_URL}/api/auth/csrf`);
        if (csrfRes.statusCode === 200) {
            const csrfData = JSON.parse(csrfRes.body);
            const csrfCookies = csrfRes.headers['set-cookie'] || [];
            const csrfCookieStr = Array.isArray(csrfCookies) ? csrfCookies.join('; ') : csrfCookies;

            const postData = new URLSearchParams({
                email: 'admin@loadtest.emspro.com',
                password: 'loadtest123',
                redirect: 'false',
                csrfToken: csrfData.csrfToken,
            }).toString();

            const loginRes = await makeRequest(
                `${BASE_URL}/api/auth/callback/credentials`,
                'POST',
                { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookieStr },
                postData
            );

            const setCookie = loginRes.headers['set-cookie'];
            if (setCookie) {
                const cookiesStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
                const match = cookiesStr.match(/(?:__Secure-)?authjs\.session-token=([^;]+)/);
                if (match) {
                    const cookieName = cookiesStr.includes('__Secure-authjs.session-token')
                        ? '__Secure-authjs.session-token'
                        : 'authjs.session-token';
                    console.log('Authenticated via NextAuth cookie');
                    return { type: 'cookie', token: `${cookieName}=${match[1]}` };
                }
            }
        }
    } catch { /* fall through */ }

    console.warn('Could not authenticate — running load tests without auth (expect 401/403)');
    return { type: 'none', token: '' };
}

function buildHeaders(auth) {
    const headers = { 'X-Tenant-Slug': 'sourceoneai' };
    if (auth.type === 'jwt') {
        headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth.type === 'cookie') {
        headers['Cookie'] = auth.token;
    }
    return headers;
}

// ── Benchmark engine ──────────────────────────────────────────────────
async function benchmark(name, url, method, headers, iterations, concurrency, postData = null) {
    const label = `${method} ${url.replace(BASE_URL, '')}`;
    process.stdout.write(`\n  ${name} (${label}) [${iterations}x, ${concurrency} concurrent] `);

    const results = [];
    let completed = 0;

    async function worker(queue) {
        while (queue.length > 0) {
            queue.shift();
            const result = await makeRequest(url, method, headers, postData);
            results.push(result);
            completed++;
            if (completed % 5 === 0) process.stdout.write('.');
        }
    }

    const queue = Array.from({ length: iterations }, (_, i) => i);
    const workers = [];
    for (let i = 0; i < concurrency; i++) {
        workers.push(worker(queue));
    }
    await Promise.all(workers);

    const successful = results.filter((r) => r.statusCode >= 200 && r.statusCode < 400);
    const failed = results.filter((r) => r.statusCode < 200 || r.statusCode >= 400);
    const durations = successful.map((r) => r.duration).sort((a, b) => a - b);

    if (durations.length === 0) {
        const sampleCode = failed[0]?.statusCode || 'N/A';
        const sampleErr = failed[0]?.error || '';
        console.log(`\n    FAIL — all ${iterations} requests failed (status: ${sampleCode} ${sampleErr})`);
        return { name, label, success: 0, failed: iterations, avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || durations[durations.length - 1];
    const p99 = durations[Math.floor(durations.length * 0.99)] || durations[durations.length - 1];
    const min = durations[0];
    const max = durations[durations.length - 1];
    const rps = (successful.length / (max / 1000)).toFixed(1);

    console.log(`
    OK: ${successful.length}/${iterations} | Failed: ${failed.length}
    Avg: ${avg.toFixed(1)}ms | P50: ${p50.toFixed(1)}ms | P95: ${p95.toFixed(1)}ms | P99: ${p99.toFixed(1)}ms
    Min: ${min.toFixed(1)}ms | Max: ${max.toFixed(1)}ms | ~${rps} req/s`);

    return { name, label, success: successful.length, failed: failed.length, avg, p50, p95, p99, min, max };
}

// ── Main ──────────────────────────────────────────────────────────────
async function run() {
    console.log('='.repeat(70));
    console.log('  Source One Performance Module — Load Test');
    console.log(`  Base: ${BASE_URL} | Django: ${DJANGO_URL}`);
    console.log(`  Iterations: ${ITERATIONS} | Concurrency: ${CONCURRENCY}`);
    console.log('='.repeat(70));

    const auth = await getAuthToken();
    const headers = buildHeaders(auth);
    const results = [];

    // ── GET endpoints ─────────────────────────────────────────────────
    console.log('\n--- GET Endpoints ---');

    results.push(await benchmark(
        'List Review Cycles',
        `${BASE_URL}/api/performance/cycles`,
        'GET', headers, ITERATIONS, CONCURRENCY
    ));

    results.push(await benchmark(
        'List Monthly Reviews',
        `${BASE_URL}/api/performance/monthly`,
        'GET', headers, ITERATIONS, CONCURRENCY
    ));

    results.push(await benchmark(
        'List Monthly Reviews (filtered)',
        `${BASE_URL}/api/performance/monthly?review_month=3&review_year=2026`,
        'GET', headers, ITERATIONS, CONCURRENCY
    ));

    results.push(await benchmark(
        'List Appraisals',
        `${BASE_URL}/api/performance/appraisals`,
        'GET', headers, ITERATIONS, CONCURRENCY
    ));

    results.push(await benchmark(
        'List Appraisals (annual only)',
        `${BASE_URL}/api/performance/appraisals?review_type=ANNUAL`,
        'GET', headers, ITERATIONS, CONCURRENCY
    ));

    results.push(await benchmark(
        'Eligibility Check',
        `${BASE_URL}/api/performance/appraisals/eligibility?financial_year=2025-26`,
        'GET', headers, ITERATIONS, CONCURRENCY
    ));

    results.push(await benchmark(
        'List PIPs',
        `${BASE_URL}/api/performance/pip`,
        'GET', headers, ITERATIONS, CONCURRENCY
    ));

    results.push(await benchmark(
        'List PIPs (active)',
        `${BASE_URL}/api/performance/pip?status=ACTIVE`,
        'GET', headers, ITERATIONS, CONCURRENCY
    ));

    // Performance Reviews (existing endpoint)
    results.push(await benchmark(
        'Performance Reviews',
        `${BASE_URL}/api/performance/cycles?page=1&limit=10`,
        'GET', headers, Math.ceil(ITERATIONS / 2), CONCURRENCY
    ));

    // ── POST endpoints (create) ───────────────────────────────────────
    console.log('\n--- POST Endpoints (Write Load) ---');

    // Use real employee IDs from sourceoneai tenant
    const EMP1 = 'af8a7fa5-9dc6-4682-8c4b-93a1ad58d1e0';
    const EMP2 = 'c993b11f-f660-495f-875b-f06aafed9201';

    // Each POST creates a unique monthly review (unique on employee+month+year)
    let monthNum = 1;
    function nextMonthlyPayload() {
        const m = monthNum++;
        return JSON.stringify({
            employee_id: EMP1,
            review_month: m,
            review_year: 2025,
            recruiter_metrics: [
                { serial_no: 1, metric: 'No. of demands worked upon', target: 10, achieved: 8, conversion_pct: 80 },
                { serial_no: 2, metric: 'No. of CVs sourced', target: 50, achieved: 45, conversion_pct: 90 },
                { serial_no: 3, metric: 'No. of interviews scheduled', target: 20, achieved: 18, conversion_pct: 90 },
            ],
        });
    }
    const monthlyPayload = nextMonthlyPayload();

    results.push(await benchmark(
        'Create Monthly Review',
        `${BASE_URL}/api/performance/monthly`,
        'POST', headers, Math.ceil(ITERATIONS / 3), CONCURRENCY, monthlyPayload
    ));

    const appraisalPayload = JSON.stringify({
        employee_id: EMP1,
        review_type: 'ANNUAL',
        review_period: 'April 2025 - March 2026',
        financial_year: '2025-26',
    });

    results.push(await benchmark(
        'Create Appraisal',
        `${BASE_URL}/api/performance/appraisals`,
        'POST', headers, Math.ceil(ITERATIONS / 3), CONCURRENCY, appraisalPayload
    ));

    const pipPayload = JSON.stringify({
        employee_id: EMP2,
        pip_type: 'MONTHLY_30',
        start_date: '2026-03-21',
        end_date: '2026-05-20',
        specific_targets: [
            { target: 'Achieve 5 placements per month', deadline: '2026-04-30' },
            { target: 'Improve client satisfaction to 80%', deadline: '2026-05-15' },
        ],
    });

    results.push(await benchmark(
        'Create PIP',
        `${BASE_URL}/api/performance/pip`,
        'POST', headers, Math.ceil(ITERATIONS / 3), CONCURRENCY, pipPayload
    ));

    const cyclePayload = JSON.stringify({
        cycle_type: 'MONTHLY',
        period_label: 'March 2026',
        period_start: '2026-03-01',
        period_end: '2026-03-31',
        financial_year: '2025-26',
    });

    results.push(await benchmark(
        'Create Review Cycle',
        `${BASE_URL}/api/performance/cycles`,
        'POST', headers, Math.ceil(ITERATIONS / 3), CONCURRENCY, cyclePayload
    ));

    // ── Summary ───────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(70));
    console.log('  SUMMARY');
    console.log('='.repeat(70));
    console.log('');
    console.log(
        padRight('Endpoint', 35) +
        padRight('OK/Total', 10) +
        padRight('Avg(ms)', 10) +
        padRight('P95(ms)', 10) +
        padRight('Max(ms)', 10)
    );
    console.log('-'.repeat(75));

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const r of results) {
        totalSuccess += r.success;
        totalFailed += r.failed;
        console.log(
            padRight(r.name, 35) +
            padRight(`${r.success}/${r.success + r.failed}`, 10) +
            padRight(r.avg.toFixed(1), 10) +
            padRight(r.p95.toFixed(1), 10) +
            padRight(r.max.toFixed(1), 10)
        );
    }

    console.log('-'.repeat(75));
    console.log(`Total: ${totalSuccess} succeeded, ${totalFailed} failed out of ${totalSuccess + totalFailed} requests`);

    // ── Pass/Fail gate ────────────────────────────────────────────────
    const failRate = totalFailed / (totalSuccess + totalFailed);
    const slowEndpoints = results.filter((r) => r.p95 > 5000);

    console.log('');
    if (failRate > 0.1) {
        console.log(`WARN: High failure rate (${(failRate * 100).toFixed(1)}%) — check Django connectivity`);
    }
    if (slowEndpoints.length > 0) {
        console.log(`WARN: ${slowEndpoints.length} endpoint(s) with P95 > 5s:`);
        slowEndpoints.forEach((e) => console.log(`  - ${e.name}: ${e.p95.toFixed(0)}ms`));
    }
    if (failRate <= 0.1 && slowEndpoints.length === 0 && totalSuccess > 0) {
        console.log('PASS: All endpoints within acceptable thresholds');
    }

    console.log('\nLoad test complete.');
}

function padRight(str, len) {
    const s = String(str);
    return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

run().catch((err) => {
    console.error('Load test crashed:', err);
    process.exit(1);
});
