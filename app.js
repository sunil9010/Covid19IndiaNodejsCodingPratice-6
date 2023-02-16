const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
const convertStatesData = (dbData) => {
  return {
    stateId: dbData.state_id,
    stateName: dbData.state_name,
    population: dbData.population,
  };
};

const convertTheDistrictData = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
//GET STATES...........
app.get("/states/", async (require, response) => {
  const statesQuery = `
    SELECT
    *
    FROM
    state;`;
  const statesData = await database.all(statesQuery);
  response.send(statesData.map((each) => convertStatesData(each)));
});
//GET states with stateId..
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const byUniqueId = `
    SELECT 
    *
    FROM
    state
    WHERE
    state_id = '${stateId}';`;
  const uniqueQuery = await database.get(byUniqueId);
  response.send(convertStatesData(uniqueQuery));
});
//POST district...
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postingQuery = `
    INSERT INTO
    district (district_name,state_id,cases,cured,active,deaths)
    VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
    await database.run(postingQuery);
    response.send('District Successfully Added');
});
//GET district based on id
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtsQuery = `
    SELECT
    *
    FROM
    district
    WHERE
    district_id = '${districtId}';`;
  const getDbQuery = await database.get(districtsQuery);
  response.send(convertTheDistrictData(getDbQuery));
});
//DELETE District.........
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `
    DELETE FROM
    district
    WHERE
    district_id = '${districtId}'`;
  await database.run(deleteQuery);
  response.send("District Removed");
});
//DISTRICT PUT..
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, active, deaths, cured } = request.body;
  const updateQuery = `
    UPDATE 
    district
    SET
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}' ;`;
  await database.run(updateQuery);
  response.send("District Details Updated");
});
//STATE state status....
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const casesQuery = `
  SELECT
  SUM(cases),
  SUM(cured),
  SUM(active),
  SUM(deaths)
  FROM
  district
  WHERE
  state_id = '${stateId}';`;
  const cases = await database.get(casesQuery);
  response.send({
    totalCases: cases["SUM(cases)"],
    totalCured: cases["SUM(cured)"],
    totalActive: cases["SUM(active)"],
    totalDeaths: cases["SUM(deaths)"],
  });
});
//state name based on district_id
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateDistrict = `
    SELECT 
    state_name
    FROM
    district 
    NATURAL JOIN
    state
    WHERE
    district_id = '${districtId}'`;
  const districtState = await database.get(stateDistrict);
  response.send({ stateName: districtState.state_name });
});
module.exports = app;
