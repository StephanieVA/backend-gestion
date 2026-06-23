// Railway/Heroku entrypoint compatibility
// Este archivo existe para evitar el error: Cannot find module '/app/index.js'
// y para delegar en el servidor real.
require("./server");
