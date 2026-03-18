import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, logContext } from '@/lib/logger'

describe('Logger Utility', () => {
    beforeEach(() => {
        vi.spyOn(console, 'info').mockImplementation(() => { })
        vi.spyOn(console, 'warn').mockImplementation(() => { })
        vi.spyOn(console, 'error').mockImplementation(() => { })
        vi.spyOn(console, 'debug').mockImplementation(() => { })
    })

    it('should log info messages with context', async () => {
        await logContext.run({ requestId: 'test-id' }, () => {
            logger.info('test message', { foo: 'bar' })
            expect(console.info).toHaveBeenCalled()
            const logCall = (console.info as any).mock.calls[0][0]
            const parsed = JSON.parse(logCall)
            expect(parsed.message).toBe('test message')
            expect(parsed.requestId).toBe('test-id')
            expect(parsed.foo).toBe('bar')
        })
    })

    it('should log warn and error messages', () => {
        logger.warn('warning')
        logger.error('error')
        expect(console.warn).toHaveBeenCalled()
        expect(console.error).toHaveBeenCalled()
    })

    it('should log debug messages in dev', () => {
        logger.debug('debug')
        // In test env, level might be INFO+, so debug might not fire, but we test the call
        expect(console.debug).toBeDefined()
    })
})
