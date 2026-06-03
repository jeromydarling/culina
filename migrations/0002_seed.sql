-- Reference data for Culina (D1). Accounts are created via signup (passwords are
-- hashed by the Worker), so no users are seeded here. Demo content (kitchens,
-- bookings, etc.) is available instantly in the app's built-in demo mode.

INSERT OR IGNORE INTO grants (id, title, description, funder, grant_type, amount_min, amount_max, application_url, is_recurring, is_active, created_at) VALUES
  ('gr_1','USDA Value-Added Producer Grant','Helps producers add value to raw commodities.','USDA Rural Development','federal',50000,250000,'https://www.rd.usda.gov',1,1,'2026-01-01T00:00:00Z'),
  ('gr_2','SBA Microloan Program','Loans up to $50k for small businesses.','U.S. Small Business Administration','loan',5000,50000,'https://www.sba.gov',1,1,'2026-01-01T00:00:00Z'),
  ('gr_3','Minnesota Emerging Entrepreneur Loan','Supports minority- and women-owned small businesses in MN.','MN DEED','state',5000,150000,'https://mn.gov/deed',0,1,'2026-01-01T00:00:00Z'),
  ('gr_4','Finnegan Foundation Food Innovation','Annual grant for food entrepreneurs improving community food access.','Finnegan Foundation','foundation',10000,25000,'https://example.org/grant',1,1,'2026-01-01T00:00:00Z'),
  ('gr_5','Local First Microgrant','City of Minneapolis storefront support microgrant.','City of Minneapolis','local',1000,10000,'https://minneapolismn.gov',0,1,'2026-01-01T00:00:00Z'),
  ('gr_6','Hot Bread Kitchen Catalyst','Funding + mentorship for women food entrepreneurs.','Hot Bread Kitchen','foundation',5000,20000,'https://hotbreadkitchen.org',1,1,'2026-01-01T00:00:00Z'),
  ('gr_7','Kiva Crowdfunded Loan','0% interest crowdfunded microloans.','Kiva','loan',1000,15000,'https://kiva.org',1,1,'2026-01-01T00:00:00Z'),
  ('gr_8','Comcast RISE Investment Fund','Grants for small businesses owned by people of color.','Comcast','foundation',5000,5000,'https://comcastrise.com',1,1,'2026-01-01T00:00:00Z'),
  ('gr_9','USDA Farmers Market Promotion','Grows direct producer-to-consumer markets.','USDA AMS','federal',50000,100000,'https://www.ams.usda.gov',1,1,'2026-01-01T00:00:00Z'),
  ('gr_10','Regional CDFI Working Capital','Flexible working capital from a CDFI.','Local CDFI','loan',10000,100000,'https://example.org/cdfi',1,1,'2026-01-01T00:00:00Z');

INSERT OR IGNORE INTO learning_resources (id, title, description, content_type, category, duration_minutes, is_free, created_at) VALUES
  ('lr_1','How to Form an LLC for Your Food Business','Step-by-step LLC formation walkthrough.','guide','business_formation',15,1,'2026-01-01T00:00:00Z'),
  ('lr_2','ServSafe Food Handler Basics','Core food safety concepts every kitchen tenant must know.','article','food_safety',20,1,'2026-01-01T00:00:00Z'),
  ('lr_3','FDA Nutrition Facts Label Requirements','What must appear on a packaged food label.','checklist','labeling_compliance',10,1,'2026-01-01T00:00:00Z'),
  ('lr_4','Pricing for Profit: COGS & Margins','Turn recipe costs into sustainable pricing.','article','financial_planning',18,1,'2026-01-01T00:00:00Z'),
  ('lr_5','Instagram for Food Brands','Grow a following and convert it into orders.','video','marketing',25,1,'2026-01-01T00:00:00Z'),
  ('lr_6','Getting Into Farmers Markets','Application tips and what buyers look for.','guide','sales_channels',12,1,'2026-01-01T00:00:00Z'),
  ('lr_7','From Kitchen to Co-Packer','When and how to scale beyond a shared kitchen.','guide','scaling',22,0,'2026-01-01T00:00:00Z'),
  ('lr_8','Graduation Readiness Checklist','Signs you are ready for your own facility.','checklist','graduation_planning',8,1,'2026-01-01T00:00:00Z');

INSERT OR IGNORE INTO mentors (id, name, expertise, bio, availability, rate, avatar_emoji, created_at) VALUES
  ('me_1','Carla Whitfield','Food law & compliance','20 years guiding CPG brands through FDA labeling and state permitting.','2 slots/week','Free (volunteer)','⚖️','2026-01-01T00:00:00Z'),
  ('me_2','Devon Park','Wholesale & distribution','Former grocery buyer; helps makers land their first retail accounts.','Monthly office hours','Free (volunteer)','📦','2026-01-01T00:00:00Z'),
  ('me_3','Aisha Rahman','Branding & marketing','Built three food brands from farmers market to national shelf.','1 slot/week','$50/session','🎨','2026-01-01T00:00:00Z'),
  ('me_4','Luis Moreno','Scaling & co-packing','Operations consultant for small-batch to mid-scale production.','By request','$75/session','🏭','2026-01-01T00:00:00Z'),
  ('me_5','Grace Lin','Financing & grants','CDFI lender; helps makers prepare loan and grant applications.','2 slots/month','Free (volunteer)','💰','2026-01-01T00:00:00Z');
