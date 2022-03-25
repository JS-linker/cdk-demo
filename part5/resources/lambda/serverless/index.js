const AWS = require("aws-sdk");
const S3 = new AWS.S3();

const bucketName = process.env.BUCKET;

exports.handler = async function (event, context) {
  try {
    const method = event.httpMethod;
    // Get name, if present
    const widgetName = event.path.startsWith("/")
      ? event.path.substring(1)
      : event.path;

    if (method === "GET") {
      // GET / to get the names of all widgets
      if (event.path === "/") {
        const data = await S3.listObjectsV2({ Bucket: bucketName }).promise();
        const body = {
          widgets: data.Contents.map(function (e) {
            return e.Key;
          }),
        };
        return {
          statusCode: 200,
          headers: {},
          body: JSON.stringify(body),
        };
      }

      if (widgetName) {
        // GET /name to get info on widget name
        const data = await S3.getObject({
          Bucket: bucketName,
          Key: widgetName,
        }).promise();
        const body = data.Body.toString("utf-8");

        return {
          statusCode: 200,
          headers: {},
          body: JSON.stringify(body),
        };
      }
    }

    if (method === "POST") {
      // POST /name
      // Return error if we do not have a name
      if (!widgetName) {
        return {
          statusCode: 400,
          headers: {},
          body: "Widget name missing",
        };
      }

      // Create some dummy data to populate object
      const now = new Date();
      const data = widgetName + " created: " + now;

      const base64data = new Buffer(data, "binary");

      await S3.putObject({
        Bucket: bucketName,
        Key: widgetName,
        Body: base64data,
        ContentType: "application/json",
      }).promise();

      return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify(event.widgets),
      };
    }

    if (method === "DELETE") {
      // DELETE /name
      // Return an error if we do not have a name
      if (!widgetName) {
        return {
          statusCode: 400,
          headers: {},
          body: "Widget name missing",
        };
      }

      await S3.deleteObject({
        Bucket: bucketName,
        Key: widgetName,
      }).promise();

      return {
        statusCode: 200,
        headers: {},
        body: "Successfully deleted widget " + widgetName,
      };
    }

    // We got something besides a GET, POST, or DELETE
    return {
      statusCode: 400,
      headers: {},
      body: "We only accept GET, POST, and DELETE, not " + method,
    };
  } catch (error) {
    const body = error.stack || JSON.stringify(error, null, 2);
    return {
      statusCode: 400,
      headers: {},
      body: body,
    };
  }
};
