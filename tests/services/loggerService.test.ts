import { LoggerService, logger } from "../../src/services/loggerService";

describe("LoggerService", () => {
  let loggerService: LoggerService;

  beforeEach(() => {
    loggerService = LoggerService.getInstance();
  });

  describe("Singleton pattern", () => {
    it("должен возвращать один и тот же экземпляр", () => {
      const instance1 = LoggerService.getInstance();
      const instance2 = LoggerService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(logger);
    });
  });

  describe("Logging methods", () => {
    it("должен иметь все необходимые методы логирования", () => {
      expect(typeof loggerService.error).toBe("function");
      expect(typeof loggerService.warn).toBe("function");
      expect(typeof loggerService.info).toBe("function");
      expect(typeof loggerService.debug).toBe("function");
      expect(typeof loggerService.logUserActivity).toBe("function");
      expect(typeof loggerService.logSystemEvent).toBe("function");
      expect(typeof loggerService.logApiCall).toBe("function");
    });

    it("должен логировать без ошибок", () => {
      expect(() => {
        loggerService.info("Test info message");
        loggerService.warn("Test warning message");
        loggerService.error("Test error message");
        loggerService.debug("Test debug message");
      }).not.toThrow();
    });

    it("должен логировать активность пользователя", () => {
      expect(() => {
        loggerService.logUserActivity(12345, "testuser", "test_action", {
          additionalInfo: "test",
        });
      }).not.toThrow();
    });

    it("должен логировать системные события", () => {
      expect(() => {
        loggerService.logSystemEvent("test_event", {
          details: "test details",
        });
      }).not.toThrow();
    });

    it("должен логировать API вызовы", () => {
      expect(() => {
        loggerService.logApiCall("TestService", "testMethod", 100, true);
        loggerService.logApiCall(
          "TestService",
          "testMethod",
          200,
          false,
          new Error("Test error")
        );
      }).not.toThrow();
    });
  });

  describe("Error handling", () => {
    it("должен корректно обрабатывать Error объекты", () => {
      const testError = new Error("Test error message");
      testError.stack = "Test stack trace";

      expect(() => {
        loggerService.error("Test error with Error object", testError);
      }).not.toThrow();
    });

    it("должен корректно обрабатывать не-Error объекты", () => {
      expect(() => {
        loggerService.error("Test error with string", "string error");
        loggerService.error("Test error with number", 123);
        loggerService.error("Test error with object", { error: "test" });
      }).not.toThrow();
    });
  });

  describe("Winston integration", () => {
    it("должен возвращать Winston logger", () => {
      const winstonLogger = loggerService.getWinstonLogger();
      expect(winstonLogger).toBeDefined();
      expect(typeof winstonLogger.info).toBe("function");
      expect(typeof winstonLogger.error).toBe("function");
    });
  });
});
