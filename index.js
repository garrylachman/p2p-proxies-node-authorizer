"use strict";

const config = require("./config.json");
const argv = require( 'argv' );
const waterfall = require("promise-waterfall");

let request = require('request').defaults({jar: true});

class P2PProxiesNodeAuthorizer {

  constructor() {
    this.options = this.parse_argv();
    this.validate();
    this.api_login = config.api.base + config.api.login;
    this.api_add = config.api.base + config.api.add;
    this.api_check = config.api.base + config.api.check;
    this.ip_provider = config.ip_provider;
    this.email = this.options.options.email;
    this.password = this.options.options.password;

    let seq = [
      this.login.bind(this),
      this.check.bind(this),
      this.remote_ip.bind(this),
      this.add.bind(this)
    ];

    waterfall(seq)
      .then(() => {
        console.log(this.remote_ip + " authorized successfully");
      })
      .catch((err) => {
        if (err.error.code == '-1') {
          console.error(this.remote_ip + " already authorized")
        } else if (err.error.code == '-5') {
          console.error("Login failure, check your credentials");
        } else {
          console.error(err);
        }
      });
  }

  validate() {
    if ( ! this.options.options.email || ! this.options.options.password) {
      argv.help();
      process.exit();
    }
  }

  parse_argv() {
    return argv.option([
      {
        name: "email",
        type: "string",
        description: "Your https://rev.proxies.online account e-mail",
        example: "'--email=example@email.com'"
      },
      {
        name: "password",
        type: "string",
        description: "Your https://rev.proxies.online account password",
        example: "'--password=yourpassword'"
      }
    ]).run();
  }

  remote_ip() {
    return new Promise( (resolve, reject) => {
      request.get(this.ip_provider, (err, httpResponse, body) => {
        if (err) reject(err);

        let res = JSON.parse(body);
        if (res.origin) {
          this.remote_ip = res.origin;
          resolve()
        } else {
          reject(res);
        }
      });
    });
  }

  login() {
    return new Promise( (resolve, reject) => {
      request.post(
        { url: this.api_login,
          form: {
            email: this.email,
            password: this.password
          }
        },
        (err, httpResponse, body) => {
          if (err) reject(err);

          let res = JSON.parse(body);
          if (res.status == 1) {
            resolve()
          } else {
            reject(res);
          }
        }
      );
    });
  }

  check() {
    return new Promise( (resolve, reject) => {
      request.post(
        {
          url: this.api_check
        },
        (err, httpResponse, body) => {
          if (err) reject(err);

          let res = JSON.parse(body);
          if (res.status == 1) {
            resolve()
          } else {
            reject(res);
          }
        }
      );
    });
  }

  add() {
    return new Promise( (resolve, reject) => {
      request.post(
        { url: this.api_add,
          form: {
            ip: this.remote_ip
          }
        },
        (err, httpResponse, body) => {
          if (err) reject(err);

          let res = JSON.parse(body);
          if (res.status == 1) {
            resolve()
          } else {
            reject(res);
          }
        }
      );
    });
  }

}

const app = new P2PProxiesNodeAuthorizer();
