"use strict";
const aws = require("aws-sdk");
const stepfunctions = new aws.StepFunctions();
// asset-input/resources/lambda/sns-x-account/main.ts
exports.handler = async (event) => {
    console.log("event", event.Records);
    const params = {
        stateMachineArn: 'TODO',
        /* required */
        input: 'STRING_VALUE',
        // name: 'STRING_VALUE',
        // traceHeader: 'STRING_VALUE'
    };
    await new Promise(res => {
        stepfunctions.startExecution(params, function(err, data) {
            if (err) console.log('stepfunctions.startExecution', err, err.stack); // an error occurred
            else console.log('stepfunctions.startExecution', data); // successful response
            res()
        });
    })
};
