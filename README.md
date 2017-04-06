# instructions to run 
1. run `npm install` inside the `server` folder.
2. in index.js, you need to set the port variable by changing the default `process.env.PORT` with your localhost port or whatever you are using.
3. in client/services.js modify the `const theUrl` and set it with your server's url. It could be 'http://localhost:8080/api/v1/gnomes/' 
4. launch server with `node server/index.js`