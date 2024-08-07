import { Document } from "mongodb";
import { syncQueryToTable } from "../sync-util";
import { mongoConnect } from "../util";

/*
Partitioned: _sync_time (HOUR)
Clustered by: Operational_Office, Organisation_ID
*/

export const syncTeams = async () => {
  const { db, client: mongoClient } = await mongoConnect();
  const syncResult = await syncQueryToTable(
    db.collection("teams").find(
      { "settings.ignore_tracking": { $ne: true } },
      {
        // sort: { _id: -1 },
        projection: {
          _id: 1,
          _organisation_id: 1,
          name: 1,
          operational_office: 1,
          "users._id": 1,
          "users.status": 1,
          "settings.billing.subscription": 1,
        },
      }
    ),
    (doc) => {
      return {
        ID: doc._id.toString(),
        Name: doc.name ?? null,
        Operational_Office: doc.operational_office ?? null,
        Organisation_ID: doc._organisation_id
          ? doc._organisation_id.toString()
          : null,
        User_IDs: doc.users
          ? doc.users
              .filter((user: Document) => user._id && user.status !== 0)
              .map((user: Document) => user._id.toString())
          : null,
        Credit_Balance:
          doc.settings?.billing?.subscription?.credit?.remaining ?? null,
        Credit_Expiry: doc.settings?.billing?.subscription?.end
          ? new Date(doc.settings.billing.subscription.end)
          : null,
      };
    },
    "teams"
  );

  await mongoClient.close();

  return syncResult;
};
