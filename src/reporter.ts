import { type Awaitable, type File, type Reporter, type TaskResultPack, type UserConsoleLog, type Vitest } from 'vitest';
import { getSuites, getTests } from '@vitest/runner/utils'

interface TestSummary {
    totalSuitesCount: number;
    failedSuitesCount: number;
    totalTestsCount: number;
    failedTestsCount: number;
    suiteErrors: Array<{ file: string; error: string }>;
}

class SummaryReporter implements Reporter {
    private ctx!: Vitest;

    onInit(ctx: Vitest): void {
        this.ctx = ctx;
    }

    getSummary(files: File[]): TestSummary {
        const suites = getSuites(files);
        const tests = getTests(files);

        const failedSuites = suites.filter(i => i.result?.errors);
        const failedTests = tests.filter(i => i.result?.state === 'fail');
        const summary: TestSummary = {
            failedSuitesCount: failedSuites.length,
            totalSuitesCount: suites.length,
            failedTestsCount: failedTests.length,
            totalTestsCount: tests.length,
            suiteErrors: []
        };
        if (failedSuites.length > 0) {
            for (const suite of failedSuites) {
                for (const error of (suite.result?.errors || [])) {
                    summary.suiteErrors.push({
                        file: suite.name,
                        error: error.stack ?? ''
                    });
                }
            }
        }

        return summary;
    }

    onFinished(files = this.ctx.state.getFiles(), errors = this.ctx.state.getUnhandledErrors()): Awaitable<void> {
        const summary = this.getSummary(files);

        this.ctx.logger.console.info("##teamcity[message name='==================== Tests summary ====================']");
        this.ctx.logger.console.info(`##teamcity[message text='Test Suites:   ${summary.failedSuitesCount} failed | ${summary.totalSuitesCount - summary.failedSuitesCount} passed']`);
        this.ctx.logger.console.info(`##teamcity[message text='Test:          improv${summary.failedTestsCount} failed | ${summary.totalTestsCount - summary.failedTestsCount} passed']`);
        if (summary.suiteErrors.length > 0) {
            this.ctx.logger.console.info("##teamcity[message text='-------------------- Suite errors --------------------']");
            for (const error of summary.suiteErrors) {
                this.ctx.logger.console.info(`##teamcity[message text='${error.error}' status='error']`);
            }
            this.ctx.logger.console.info("##teamcity[message text='------------------------------------------------------']");
        }
        this.ctx.logger.console.info("##teamcity[message name='=======================================================']");
        return Promise.resolve();
    }
}

export { SummaryReporter }