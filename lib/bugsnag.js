var Bugsnag, BugsnagError, Configuration, Logger, Notification, Utils, path,
  __slice = [].slice;

path = require("path");

Utils = require("./utils");

Logger = require("./logger");

Configuration = require("./configuration");

BugsnagError = require("./error");

Notification = require("./notification");

Error.stackTraceLimit = Infinity;

module.exports = Bugsnag = (function() {
  var autoNotifyCallback, shouldNotify, unCaughtErrorHandlerAdded;

  function Bugsnag() {}

  unCaughtErrorHandlerAdded = false;

  Object.defineProperty(Bugsnag, 'metaData', {
    get: function() {
      return Configuration.metaData;
    },
    set: function(metaData) {
      return Configuration.metaData = metaData;
    }
  });

  Bugsnag.register = function(apiKey, options) {
    if (options == null) {
      options = {};
    }
    Configuration.apiKey = apiKey;
    Bugsnag.configure(options);
    return Configuration.logger.info("Registered with apiKey " + apiKey);
  };

  Bugsnag.configure = function(options) {
    Configuration.configure(options);
    if (Configuration.autoNotifyUncaught && !unCaughtErrorHandlerAdded) {
      unCaughtErrorHandlerAdded = true;
      Configuration.logger.info("Configuring uncaughtExceptionHandler");
      return process.on("uncaughtException", function(err) {
        return Bugsnag.notify(err, {
          severity: "error"
        }, autoNotifyCallback(err, true));
      });
    }
  };

  Bugsnag.notify = function(error, options, cb) {
    var bugsnagErrors, notification;
    if (Utils.typeOf(options) === "function") {
      cb = options;
      options = {};
    }
    options || (options = {});
    if (!shouldNotify()) {
      if (cb) {
        cb();
      }
      return;
    }
    Configuration.logger.info("Notifying Bugsnag of exception...\n" + ((error != null ? error.stack : void 0) || error));
    bugsnagErrors = BugsnagError.buildErrors(error, options.errorName);
    delete options.errorName;
    notification = new Notification(bugsnagErrors, options);
    return notification.deliver(cb);
  };

  Bugsnag.intercept = function(cb) {
    if (!cb) {
      cb = (function() {});
    }
    if (process.domain) {
      return process.domain.intercept(cb);
    } else {
      return function() {
        var args, err;
        err = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        if (err && (err instanceof Error)) {
          return Bugsnag.notify(err, {
            severity: "error"
          }, autoNotifyCallback(err));
        }
        if (cb) {
          return cb.apply(null, args);
        }
      };
    }
  };

  Bugsnag.autoNotify = function(options, cb) {
    var dom, domain;
    if (Utils.typeOf(options) === "function") {
      cb = options;
      options = {};
    }
    domain = require("domain");
    dom = domain.create();
    dom._bugsnagOptions = options;
    options["severity"] = "error";
    dom.on('error', function(err) {
      return Bugsnag.notify(err, options, autoNotifyCallback(err));
    });
    process.nextTick(function() {
      return dom.run(cb);
    });
    return dom;
  };

  shouldNotify = function() {
    return (Configuration.notifyReleaseStages === null || Configuration.notifyReleaseStages.indexOf(Configuration.releaseStage) !== -1) && Configuration.apiKey;
  };

  autoNotifyCallback = function(notifiedError, uncaughtError) {
    if (uncaughtError == null) {
      uncaughtError = notifiedError.domain;
    }
    return function(error) {
      if (error) {
        Configuration.logger.error("Bugsnag: error notifying bugsnag.com - " + error);
      }
      if (Configuration.onUncaughtError && uncaughtError) {
        return Configuration.onUncaughtError(notifiedError);
      }
    };
  };

  return Bugsnag;

})();
