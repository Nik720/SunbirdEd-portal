"use strict";
const path = require("path");
const fs = require("fs");
const envHelper = require("./../environmentVariablesHelper.js");
var exec = require('child_process').exec;
const request = require('request-promise');

// PhraseApp Configuration
const authToken = envHelper.PHRASE_APP.phrase_authToken;
const project = envHelper.PHRASE_APP.phrase_project;
const locale = envHelper.PHRASE_APP.phrase_locale;
const fileformat = envHelper.PHRASE_APP.phrase_fileformat;
const merge = true;
const generaliseLblKeys = ['dflt', 'crs', 'tbk', 'tvc'];

const rbPatah = path.join(__dirname, '/./../../node_modules/sunbird-localization/index.js');

const readFiles = function(dirname) {
  const readDirPr = new Promise(function(resolve, reject) {
    fs.readdir(dirname, function(err, filenames) {
      err ? reject(err) : resolve(filenames);
    });
  });

  return readDirPr.then(function(filenames) {
    return Promise.all(
      filenames.map(function(filename) {
        return new Promise(function(resolve, reject) {
          fs.readFile(dirname + filename, "utf-8", function(err, content) {
            if (err) {
              reject(err);
            } else {
              var fn = path.basename(filename, ".properties");
              var resp = { name: fn, content: content };
              resolve(resp);
            }
          });
        });
      })
    ).catch(function(error) {
      Promise.reject(error);
    });
  });
};

var mergeNbuildCreationResource = async function() {
  const creationRes = {
    path: path.join(__dirname, "/./../../sunbirdresourcebundle/"),
    dest: path.join(__dirname, "/./../../resourcebundles/generalise-lables/")
  }
  return new Promise(function(resolve, reject) {
    readFiles(creationRes.path).then(
      function(allContents) {
        var resObj = {};
        allContents.forEach(async function(contentObj) {
          const fileName = contentObj.name;
          const fileContent = JSON.parse(contentObj.content);
          generaliseLblKeys.forEach((k) => {
            if(fileContent[k]) {
                resObj[(k)] = fileContent[k];
            }
          })
          if (!fs.existsSync(creationRes.dest)) {
            fs.mkdirSync(creationRes.dest);
          }
          fs.writeFileSync(`${creationRes.dest}all_labels_${fileName}`, JSON.stringify(resObj));
        });
        resolve(true);
      },
      function(error) {
        reject(error);
      }
    );
  });
};

const pullPhraseAppLocale = async function() {
  const cmd = `node ${rbPatah} -authToken="token ${authToken}" -project="${project}" -locale="${locale}" -merge="${merge}" -fileformat="${fileformat}"`;
  exec(cmd, function async(err, stdout, stderr) {
    if(!err) {
      mergeNbuildCreationResource().then(async res => {
        if(res) {
          deleteFolderRecursive(path.join(__dirname, "/./../../sunbirdresourcebundle"));
        }
      });
    }
  })
}

const uploadFilesToBlob = async() => {
  var options = {
    method: 'GET',
    url:'/uploadGeneraliseLables',
    headers: {
      'Content-Type': 'application/json'
    }
  }
  return request(options).then(data => {
    if (data.responseCode === 'OK') {
      return data;
    } else {
      throw new Error(data);
    }
  }).catch(err => {
    console.log("New eeee : ", err.message);
  });
}

/**
 * Function is used to delete non empty directory 
 * @param  {path} Directory path
 */
var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

pullPhraseAppLocale();
