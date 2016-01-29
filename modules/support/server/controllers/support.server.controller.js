'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
    textProcessor = require(path.resolve('./modules/core/server/controllers/text-processor.server.controller')),
    config = require(path.resolve('./config/config')),
    nodemailer = require('nodemailer'),
    validator = require('validator'),
    async = require('async');

/**
 * Send support request to our support systems
 */
exports.supportRequest = function(req, res) {
  async.waterfall([

    // Prepare TEXT email
    function(done) {

      var renderVars = {
        message:       (req.body.message) ? textProcessor.plainText(req.body.message) : '—',
        username:      (req.user) ? req.user.username : textProcessor.plainText(req.body.username),
        email:         (req.user) ? req.user.email : textProcessor.plainText(req.body.email),
        displayName:   (req.user) ? req.user.displayName : '-',
        userId:        (req.user) ? req.user._id.toString() : '-',
        userAgent:     (req.headers['user-agent']) ? textProcessor.plainText(req.headers['user-agent']) : '—',
        authenticated: (req.user) ? 'yes' : 'no',
      };

      res.render(
        path.resolve('./modules/core/server/views/email-templates-text/support-request'),
        renderVars,
        function(err, emailPlain) {
          done(err, emailPlain, renderVars);
        });
    },

    // If valid email, send reset email using service
    function(emailPlain, renderVars, done) {
      var smtpTransport = nodemailer.createTransport(config.mailer.options);

      var fromMail = {
        // Trust registered user's email, otherwise validate it
        // Default to TO-support email
        address: (req.user || validator.isEmail(renderVars.email)) ? renderVars.email : config.supportEmail
      };

      // Add name to sender if we have it
      if(req.user) {
        fromMail.name = req.user.displayName;
      }

      var mailOptions = {
        from: fromMail,
        to: 'Trustroots <' + config.supportEmail + '>',
        subject: 'Support request',
        text: emailPlain
      };

      smtpTransport.sendMail(mailOptions, function(err) {
        smtpTransport.close(); // close the connection pool
        if (!err) {
          return res.send();
        } else {
          return res.status(400).send({
            message: 'Failure while sending your support request. Please try again.'
          });
        }
      });
    }
  ], function(err) {
    if(err) {
      console.log('Support request error:');
      console.log(err);
      return res.status(400).send({
        message: 'Failure while sending your support request. Please try again.'
      });
    }
  });
};
