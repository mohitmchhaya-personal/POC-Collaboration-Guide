import type { ChatResponse } from "./types";

export type ChatFixture = Pick<ChatResponse, "message">;

export const mentalHealthYouthFixture: ChatFixture = {
  message: {
    role: "assistant",
    content: `For youth mental-health collaboration in Los Angeles, a promising starting point is a small network of neighborhood organizations that can combine trusted relationships, culturally responsive care, and practical pathways into longer-term treatment. The strongest partnership model would connect school-adjacent programs with community wellness groups, rather than asking one organization to provide every service alone.

Bright Harbor Youth Wellness is a fictional community counseling organization serving teens through drop-in groups, family navigation, and peer-led workshops. A collaboration could pair its clinical referral network with Harborlight Learning Collective, which offers after-school mentoring and creative programs in South Los Angeles. Together, they could create a warm handoff for young people who disclose stress, grief, or anxiety in a non-clinical setting.

Another useful connection is Mosaic Minds Los Angeles, a fictional bilingual youth arts program that uses music and storytelling to make conversations about emotional wellbeing less stigmatized. Its facilitators could collaborate with Bright Harbor on referral training, while Harborlight provides consistent spaces for group sessions and caregiver outreach. The partnership would be stronger if all three groups agreed on consent, privacy, and follow-up expectations before launching.

These organizations should begin with a focused pilot: one shared workshop series, a simple referral map, and a monthly review of attendance and participant feedback. That approach keeps the work manageable while testing whether families experience the collaboration as coordinated rather than fragmented. Public information should be verified directly with each organization before outreach.`,
  },
};

export const foodInsecurityFixture: ChatFixture = {
  message: {
    role: "assistant",
    content: `For food-insecurity work, the most useful collaborations often join direct distribution with benefits navigation, culturally familiar food access, and neighborhood-level knowledge. A potential partnership should therefore look beyond the largest pantry and ask which organizations already have trust with households that are missing meals or struggling with rising costs.

Common Table Neighbors is a fictional food pantry network that coordinates weekly produce boxes and mobile distributions across several transit-poor neighborhoods. It could collaborate with Orchard Bridge Family Resource Center, a fictional organization that helps families apply for nutrition benefits, locate affordable childcare, and find emergency rental support. The two groups could place benefits navigators at distribution sites so food assistance becomes an entry point to broader stability services.

A third possibility is Sunroom Community Kitchen, a fictional cooperative that prepares culturally familiar meals with local volunteers and small food businesses. Its kitchen model could complement Common Table Neighbors by turning surplus produce into ready-to-eat meals for older adults and families without reliable cooking equipment. Orchard Bridge could help identify residents who would benefit most while collecting feedback about dietary needs.

A practical first step would be a six-week pilot at one distribution location. The partners could share a calendar, define a lightweight referral process, and track reach, repeat visits, and completed benefits applications without exchanging unnecessary personal information. Before making commitments, SpreadBliss should confirm service areas, eligibility rules, capacity, and whether each organization has the staffing needed for a dependable joint program.`,
  },
};

export const veteransFixture: ChatFixture = {
  message: {
    role: "assistant",
    content: `Veteran-serving organizations can create more durable outcomes when they coordinate benefits navigation, peer connection, employment support, and family services. A useful collaboration conversation should identify where a veteran currently encounters a handoff or delay, then connect organizations that already specialize in adjacent parts of that journey.

Northstar Service Circle is a fictional peer-support organization offering small-group meetings, transition coaching, and volunteer mentors. It could work with Homefront Pathways, a fictional housing and employment nonprofit that helps veterans navigate leases, training programs, and supportive employers. Northstar's trusted peer relationships could make it easier for participants to accept a referral, while Homefront Pathways provides concrete follow-through after the initial conversation.

Another possible partner is Cedar Line Families, a fictional family-support organization focused on caregiver respite, youth programming, and practical assistance for households adjusting to deployment or transition. A coordinated effort could give families a clear route into peer support without requiring a veteran to repeat the same history to multiple intake teams. Shared orientation sessions would also help staff understand the boundaries of each service.

The partners should start with a limited referral pilot rather than a broad memorandum of understanding. They can map the most common participant needs, assign one contact at each organization, and review whether referrals result in completed appointments. Consent, information-sharing limits, accessibility, and after-hours coverage should be explicit. Current programs and eligibility should be confirmed directly before any recommendation is treated as an active opportunity.`,
  },
};

export const generalResearchFixture: ChatFixture = {
  message: {
    role: "assistant",
    content: `A strong collaboration search should begin with the problem a community is trying to solve, then identify organizations with complementary assets rather than overlapping missions. The best prospective partners may differ in size or program model, but they should share a clear population, geography, or outcome that gives the relationship a practical reason to exist.

For an initial landscape review, look for one organization with trusted community access, one with specialized program expertise, and one that can support measurement or referrals. This combination can make a pilot more useful than a loose collection of introductions. Pay attention to whether each group has a defined service area, a realistic intake process, and enough staff capacity to participate consistently.

Potential partners should be compared on the specific contribution they could make: shared outreach, co-located services, staff training, referral completion, or a joint program. Public websites and reports are useful starting points, but they rarely capture current capacity, informal partnerships, or the practical constraints that determine whether a collaboration will work. A respectful first conversation should test those assumptions.

Consider proposing a small experiment with a clear audience, timeline, owner, and feedback loop. The group can then review participation, referral quality, and participant experience before expanding. Any organization names or program details identified through research should be verified directly, and outreach should lead with a specific opportunity rather than a generic request to partner.`,
  },
};

export const chatFixtures = {
  mentalHealthYouth: mentalHealthYouthFixture,
  foodInsecurity: foodInsecurityFixture,
  veterans: veteransFixture,
  generalResearch: generalResearchFixture,
} as const;
