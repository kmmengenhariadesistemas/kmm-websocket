var xml2js = require('xml2js');
var parseString = xml2js.parseString;

function convertJson(json) {
   switch (json.$.type) {
      case "object":
         var resultado = {};
         for (var key in json) {
            if (key == "$" || key == "_") { // ignora
            } else {
               if (json[key].length > 1) {
                  throw new Exception("Duplicate key: "+key);
               }
               resultado[key] = convertJson(json[key][0]);
            }
         }
         return resultado;
      case "array":
         var resultado = [];
         // Varre apenas os nos arrayItem
         for (var i=0;i<json.arrayItem.length;i++) {
            resultado.push(convertJson(json.arrayItem[i]));
         }
         return resultado;
      case "string":
         if (json._ != null) {
            return json._;
         } else {
            return json;
         }
      case "number":
         if (json._ != null) {
            return Number(json._);
         } else if (json != null) {
            return Number(json);
         } else {
            return null;
         }
      case "boolean":
         var value = null;
         if (json._ != null) {
            value = json._;
         } else if (json != null) {
            value = json;
         } else {
            return null;
         }
         if (value == "false" || value == 0) {
            return false;
         } else { 
            return true;
         }
      default:
         throw new Exception("Tipo invalido \""+json.key.$.type+"\"");
         break;
   }

   return json;
}

function xml2json(xml) {
   var result;
   parseString(xml, (err, convertedJson) => {
      // A root tag do xml eh ignora na conversao
      for (var key in convertedJson) {
          result = convertJson(convertedJson[key]);
          break;
      }
      /*var resultado = {};
      // inicia o loop de conversao
      for (var key in convertedJson) {
         resultado[key] = convertJson(convertedJson[key]);
      } 
      result = resultado;*/
   });
   return result;
}

function convert2JsonXml(json) {
   if (typeof json === 'string') {
      return {
         "$": {
            type: "string"
         },
         "_": json
      };
   } else if (typeof json === 'number') {
      return {
         "$": {
            type: "number"
         },
         "_": json
      };
   } else if (typeof json === 'boolean') {
      return {
         "$": {
            type: "boolean"
         },
         "_": json
      };
   } else if (json instanceof Array) {
      var result = {
         "$": {
            type: "array"
         },
         "arrayItem": []
      };
      for (var i=0;i<json.length;i++) {
         result.arrayItem.push(convert2JsonXml(json[i]));
      }
      return result;
   } else if (typeof json === 'object') {

      var result = {
         "$": {
            type: "object"
         }
      };
      for (var key in json) {
         result[key] = [ convert2JsonXml(json[key]) ];
      }
      return result;
   }
}

function json2xml(json) {
   var resultado = { 
      params: {
         "$": {
            type: "object"
         }
      }
   };
   for (var key in json) {
      resultado.params[key] = convert2JsonXml(json[key]) ;
   }

   var builder = new xml2js.Builder();
   var xml = builder.buildObject(resultado);
   return xml;
}

module.exports = {
   xmlParser: (req, res, next) => {
      var contentType = req.headers['content-type'] || ''
        , mime = contentType.split(';')[0];

      res.respond = (obj) => {
         if (mime == 'application/json') {
            res.json(obj);
         } else if (mime == 'text/xml' || mime == 'application/xml') {
            res.contentType("application/xml");
            res.send(json2xml(obj));
         } else {
            res.json({ mime: mime });
         }
      }

      if (mime != 'text/xml' && mime != 'application/xml') {
         return next();
      }

      req.body = xml2json(req.body);

      next();
   }
}
