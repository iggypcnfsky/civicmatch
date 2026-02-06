-- Demo data for roadmap items and jobs
-- How to use:
-- 1) Replace the placeholder project_slug below with an existing project's slug
-- 2) Replace the placeholder creator_id with a valid user ID who is a member of the project
-- 3) Run this script in Supabase SQL Editor (service role) or via CLI

do
$$
declare
  v_project_slug text := '<REPLACE_WITH_PROJECT_SLUG>'; -- e.g., 'climate-action-now'
  v_creator_id uuid := '<REPLACE_WITH_CREATOR_UUID>'::uuid; -- must be a project member
  v_project_id uuid;
begin
  -- Get project ID from slug
  select id into v_project_id from public.projects where slug = v_project_slug;
  
  if v_project_id is null then
    raise notice 'Project with slug % not found; skipping seed', v_project_slug;
    return;
  end if;

  -- ============================================
  -- ROADMAP ITEMS
  -- ============================================
  
  -- Backlog items
  insert into public.roadmap_items (project_id, creator_id, data) values
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Community feedback system',
    'description', 'Build a comprehensive system for collecting and organizing community feedback on our initiatives.',
    'status', 'backlog',
    'priority', 'medium'
  )),
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Mobile app research',
    'description', 'Investigate feasibility of a native mobile app vs progressive web app approach.',
    'status', 'backlog',
    'priority', 'low'
  ));

  -- Planned items
  insert into public.roadmap_items (project_id, creator_id, data) values
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Partner onboarding flow',
    'description', 'Create a streamlined onboarding experience for new organizational partners joining our coalition.',
    'status', 'planned',
    'priority', 'high'
  )),
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Analytics dashboard',
    'description', 'Develop an internal dashboard to track engagement metrics and impact measurements.',
    'status', 'planned',
    'priority', 'medium'
  ));

  -- In Progress items
  insert into public.roadmap_items (project_id, creator_id, data) values
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'User authentication v2',
    'description', 'Upgrade authentication system with improved security and social login options.',
    'status', 'in_progress',
    'priority', 'high'
  )),
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'API documentation',
    'description', 'Write comprehensive API docs for third-party integrations and developer community.',
    'status', 'in_progress',
    'priority', 'medium'
  ));

  -- Done items
  insert into public.roadmap_items (project_id, creator_id, data) values
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Landing page redesign',
    'description', 'Complete overhaul of the public landing page with improved messaging and visuals.',
    'status', 'done',
    'priority', 'high'
  )),
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Email notifications',
    'description', 'Implement transactional email system for user notifications and updates.',
    'status', 'done',
    'priority', 'medium'
  ));

  -- ============================================
  -- JOB LISTINGS
  -- ============================================
  
  insert into public.jobs (project_id, creator_id, data) values
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Product Designer',
    'description', 'We are looking for a passionate Product Designer to help shape the future of civic engagement tools. You will work closely with engineers and community members to design intuitive, accessible interfaces that empower people to take action on issues they care about.

Key responsibilities include conducting user research, creating wireframes and prototypes, maintaining our design system, and collaborating across teams to ship features that make a real difference.',
    'location', 'Remote',
    'type', 'full_time',
    'requirements', '• 3+ years of product design experience
• Proficiency in Figma and design systems
• Experience with user research and usability testing
• Strong portfolio demonstrating UX problem-solving
• Passion for civic tech and social impact',
    'status', 'open'
  )),
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Community Manager',
    'description', 'Join our team as a Community Manager to cultivate and grow our vibrant community of civic-minded individuals. You will be the bridge between our organization and the people we serve, ensuring everyone feels heard, supported, and empowered to participate.

This role involves moderating discussions, organizing virtual and in-person events, creating community content, and gathering feedback to improve our programs.',
    'location', 'New York, NY',
    'type', 'part_time',
    'requirements', '• 2+ years of community management experience
• Excellent written and verbal communication
• Experience with community platforms (Discord, Slack, etc.)
• Event planning and facilitation skills
• Located in or near NYC for occasional in-person events',
    'status', 'open'
  )),
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Backend Engineer',
    'description', 'We are seeking a Backend Engineer to help build robust, scalable systems that power our civic engagement platform. You will work on APIs, data pipelines, and infrastructure that supports thousands of users taking action in their communities.

Tech stack includes Node.js/TypeScript, PostgreSQL, Supabase, and serverless architectures. We value clean code, thoughtful architecture, and engineers who care about the impact of their work.',
    'location', 'Remote',
    'type', 'full_time',
    'requirements', '• 4+ years of backend development experience
• Strong proficiency in Node.js and TypeScript
• Experience with PostgreSQL and database design
• Familiarity with serverless and cloud platforms
• Track record of building reliable, maintainable systems',
    'status', 'open'
  )),
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Research Volunteer',
    'description', 'Help us understand the landscape of civic technology and community organizing through volunteer research. This is a flexible opportunity for students, academics, or anyone passionate about using research to drive social change.

Projects may include mapping existing civic tech tools, analyzing community needs, documenting best practices, or conducting literature reviews on topics relevant to our mission.',
    'location', 'Flexible / Remote',
    'type', 'volunteer',
    'requirements', '• Interest in civic technology and social impact
• Strong research and analytical skills
• Ability to synthesize information clearly
• 5-10 hours per week availability
• Self-motivated and detail-oriented',
    'status', 'open'
  )),
  (v_project_id, v_creator_id, jsonb_build_object(
    'title', 'Grant Writer',
    'description', 'We are looking for an experienced Grant Writer to help secure funding for our mission-driven work. You will identify grant opportunities, craft compelling proposals, and manage relationships with foundations and funders.

This is a contract position with the potential to become ongoing based on performance and funding needs.',
    'location', 'Remote',
    'type', 'contract',
    'requirements', '• 3+ years of grant writing experience
• Proven track record of successful proposals
• Understanding of nonprofit/civic tech landscape
• Excellent writing and storytelling abilities
• Experience with foundation and government grants',
    'status', 'open'
  ));

  raise notice 'Successfully seeded % roadmap items and % jobs for project %', 8, 5, v_project_slug;
end
$$;
