const express = require('express');
const sizeSystemV2Routes = require('./dist/routes/size-system-v2.routes').default;

const app = express();
app.use(express.json());
app.use('/api', sizeSystemV2Routes);

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Testing endpoint: http://localhost:5001/api/products/1/sizes/alternatives?requestedSize=34C&regionCode=US');
});
