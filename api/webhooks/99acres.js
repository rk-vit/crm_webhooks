import sendEmail from "../../utils/sendEmail.js";
import { sql } from "../../utils/db.js";
import axios from "axios";

export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).send("Method Not Allowed");
}

try {
const { Name, Email, Mobile, remarks, Project } = req.body;

const rectifiedMobile = Mobile.startsWith("+91")
  ? Mobile
  : `+91${Mobile}`;

const whatsapp_url =
  `https://${process.env.WHATSAPP_API_KEY}:${process.env.WHATSAPP_API_TOKEN}` +
  `@[api.exotel.com/v2/accounts/$](https://api.exotel.com/v2/accounts/$){process.env.WHATSAPP_SID}/messages`;

const whatsappPayload = {
  "custom_data": "TEST_MSG",
  "status_callback": "[https://276144074cd209fa381a1c133da75f9e.m.pipedream.net](https://276144074cd209fa381a1c133da75f9e.m.pipedream.net)",
  "whatsapp": {
    "messages": [
      {
        "from": "+918047361856",
        "to": rectifiedMobile,
        "content": {
          "type": "template",
          "template": {
            "name": "lead_acknoweledgement_template",
            "language": {
              "policy": "deterministic",
              "code": "en_US"
            },
            "components": [
              {
                "type": "header",
                "parameters": [
                  {
                    "type": "image",
                    "image": {
                      "link": "[https://drive.google.com/uc?export=download&id=1sTrrxmUCmj3gyuI6LeCEgmCajB_xUMY3](https://drive.google.com/uc?export=download&id=1sTrrxmUCmj3gyuI6LeCEgmCajB_xUMY3)"
                    }
                  }
                ]
              },
              {
                "type": "body",
                "parameters": [
                  {
                    "type": "text",
                    "text": Name
                  },
                  {
                    "type": "text",
                    "text": "[https://www.instagram.com/reel/DVTTOImAHI9/](https://www.instagram.com/reel/DVTTOImAHI9/)"
                  },
                  {
                    "type": "text",
                    "text": "[https://photos.app.goo.gl/3sJssYN7bRqu3QGWA](https://photos.app.goo.gl/3sJssYN7bRqu3QGWA)"
                  },
                  {
                    "type": "text",
                    "text": "[https://drive.google.com/file/d/16uBylpcp7ds1NEw7bsfBGPK1mdbaVEz-/](https://drive.google.com/file/d/16uBylpcp7ds1NEw7bsfBGPK1mdbaVEz-/)"
                  },
                  {
                    "type": "text",
                    "text": "[https://maps.app.goo.gl/6a45hJYnG9HCWYbb9](https://maps.app.goo.gl/6a45hJYnG9HCWYbb9)"
                  }
                ]
              }
            ]
          }
        }
      }
    ]
  }
};

axios.post(
  whatsapp_url,
  whatsappPayload,
  {
    headers: {
      "Content-Type": "application/json",
    },
  }
)
.then((res) => {
  console.log("FULL DATA:", JSON.stringify(res.data, null, 2));
  console.log("MESSAGES:", JSON.stringify(res.data.response.whatsapp.messages, null, 2));
});

await sendEmail({
  subject: "New Lead - Axion's CRM via 99acres",
  data: req.body,
});

const existingLeads = await sql`
  SELECT id
  FROM leads
  WHERE phone = ${Mobile}
  LIMIT 1
`;

if (existingLeads.length > 0) {
  const leadId = existingLeads[0].id;

  await sql`
    UPDATE leads
    SET
      status = 'reengaged',
      updated_at = NOW()
    WHERE id = ${leadId}
  `;

  await sql`
    INSERT INTO timeline_events (
      lead_id,
      type,
      title,
      description,
      created_by,
      created_at
    )
    VALUES (
      ${leadId},
      'status_change',
      'Lead Re-engaged',
      ${`Customer inquired again via 99acres for project: ${Project}`},
      'system',
      NOW()
    )
  `;

  console.log(
    "99acres: Lead Re-engaged",
    leadId
  );
} else {
  const lastLeads = await sql`
    SELECT id
    FROM leads
    WHERE id LIKE 'AX%'
    ORDER BY id DESC
    LIMIT 1
  `;

  let nextId;

  if (lastLeads.length > 0) {
    const lastNum = parseInt(
      lastLeads[0].id.replace("AX", ""),
      10
    );

    const nextNum = lastNum + 1;

    nextId = `AX${nextNum
      .toString()
      .padStart(4, "0")}`;
  } else {
    nextId = "AX0001";
  }

  let assignedUsers = await sql`
    SELECT id
    FROM users
    WHERE id LIKE 'user-%'
  `;

  let assignedUserIds = [];

  for (let user of assignedUsers) {
    assignedUserIds.push(user.id);
  }

  await sql`
    INSERT INTO leads (
      id,
      name,
      email,
      phone,
      project,
      status,
      source,
      medium,
      assigned_to,
      created_at,
      updated_at,
      assigned_users
    )
    VALUES (
      ${nextId},
      ${Name},
      ${Email},
      ${Mobile},
      ${remarks + "," + Project},
      'new',
      '99acres',
      'Webhook',
      'user-1',
      NOW(),
      NOW(),
      ${assignedUserIds}
    )
  `;

  await sql`
    INSERT INTO timeline_events (
      lead_id,
      type,
      title,
      description,
      created_by,
      created_at
    )
    VALUES (
      ${nextId},
      'workflow',
      'Lead Created',
      'New lead captured from 99acres webhook',
      '99acres',
      NOW()
    )
  `;

  console.log(
    "99acres: New Lead Created",
    nextId
  );
}

return res.status(200).send("OK");
} catch (err) {
console.error(err);
return res.status(500).send("Error");
}
}