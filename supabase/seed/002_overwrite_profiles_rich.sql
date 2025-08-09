-- Overwrite all existing profiles with rich demo data
-- Run with service role (SQL Editor) or via CLI seeding in non-production.

do
$$
declare
  avatars text[] := array[
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546456073-92b9f0a8d413?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1548142813-c348350df52b?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540932239986-30128078f3c1?q=80&w=800&auto=format&fit=crop'
  ];
  cities text[] := array['London','New York','Berlin','Nairobi','San Francisco','Lagos','São Paulo','Mumbai','Paris','Tokyo'];
  countries text[] := array['UK','USA','Germany','Kenya','USA','Nigeria','Brazil','India','France','Japan'];
  timezones text[] := array['Europe/London','America/New_York','Europe/Berlin','Africa/Nairobi','America/Los_Angeles','Africa/Lagos','America/Sao_Paulo','Asia/Kolkata','Europe/Paris','Asia/Tokyo'];

  bios text[] := array[
    'I connect data and policy for climate innovation.',
    'Building civic tech for resilient communities.',
    'Designing humane systems and empowering teams.',
    'Scaling climate solutions with local partners.',
    'Bridging research and product to ship useful tools.',
    'Organizing teams to deliver outcomes with heart.',
    'Advocating for inclusive, ethical AI.',
    'Mentoring early-stage founders focused on impact.'
  ];

  skills_a text[] := array['Product','Policy','Data Science','Design','Engineering','Research'];
  skills_b text[] := array['Community','AI','Finance','Operations','Partnerships','Storytelling'];
  values_a text[] := array['Integrity','Impact','Curiosity','Generosity','Excellence','Resilience'];
  causes_a text[] := array['Climate','Civic Tech','Education','Health','Justice','Open Source'];
  tags_a text[] := array['Climate','AI','GovTech','Civic','Startup','Open Source'];

  fame text[] := array[
    'Led a cross-functional team to launch a national service.',
    'Published research that improved public policy outcomes.',
    'Open-sourced a toolkit adopted by 500+ teams.',
    'Organized grassroots coalition across 30+ cities.'
  ];
  aim_summaries text[] := array[
    'Validating user needs with 10 pilot partners.',
    'Hiring a founding team to accelerate delivery.',
    'Refactoring core systems for reliability.',
    'Fundraising to scale our impact.'
  ];
  game text[] := array[
    'Build a sustainable, mission-driven organization.',
    'Open ecosystems and collaborate across sectors.',
    'Invest in talent and long-term research.',
    'Measure impact rigorously and share learnings.'
  ];

  p record;
  idx_base int;
  idx_avatar int; idx_loc int; idx_bio int; idx_fame int; idx_game int;
  idx_s1 int; idx_s2 int; idx_s3 int; idx_v1 int; idx_v2 int; idx_c1 int; idx_c2 int; idx_t1 int; idx_t2 int;
  uname text;
  loc jsonb;
  data jsonb;
begin
  for p in select user_id, username from public.profiles loop
    idx_base := get_byte(md5(p.user_id::text), 0); -- 0..255
    idx_avatar := (idx_base % coalesce(array_length(avatars,1),1)) + 1;
    idx_loc    := (idx_base % coalesce(array_length(cities,1),1)) + 1;
    idx_bio    := (idx_base % coalesce(array_length(bios,1),1)) + 1;
    idx_fame   := (idx_base % coalesce(array_length(fame,1),1)) + 1;
    idx_game   := (idx_base % coalesce(array_length(game,1),1)) + 1;
    idx_s1     := (idx_base % coalesce(array_length(skills_a,1),1)) + 1;
    idx_s2     := ((idx_base+1) % coalesce(array_length(skills_b,1),1)) + 1;
    idx_s3     := ((idx_base+2) % coalesce(array_length(skills_a,1),1)) + 1;
    idx_v1     := (idx_base % coalesce(array_length(values_a,1),1)) + 1;
    idx_v2     := ((idx_base+1) % coalesce(array_length(values_a,1),1)) + 1;
    idx_c1     := (idx_base % coalesce(array_length(causes_a,1),1)) + 1;
    idx_c2     := ((idx_base+2) % coalesce(array_length(causes_a,1),1)) + 1;
    idx_t1     := (idx_base % coalesce(array_length(tags_a,1),1)) + 1;
    idx_t2     := ((idx_base+3) % coalesce(array_length(tags_a,1),1)) + 1;

    uname := split_part(p.username, '@', 1);
    loc := jsonb_build_object(
      'city', cities[idx_loc],
      'country', countries[idx_loc],
      'timezone', timezones[idx_loc]
    );

    data := jsonb_build_object(
      'displayName', initcap(replace(uname, '.', ' ')),
      'email', p.username,
      'bio', bios[idx_bio],
      'location', loc,
      'skills', to_jsonb(array[skills_a[idx_s1], skills_b[idx_s2], skills_a[idx_s3]]),
      'values', to_jsonb(array[values_a[idx_v1], values_a[idx_v2]]),
      'causes', to_jsonb(array[causes_a[idx_c1], causes_a[idx_c2]]),
      'tags', to_jsonb(array[tags_a[idx_t1], tags_a[idx_t2]]),
      'links', to_jsonb(array[
        'https://x.com/'||uname,
        'https://'||uname||'.example.org'
      ]),
      'fame', fame[idx_fame],
      'aim', jsonb_build_array(
        jsonb_build_object('title','Current focus','summary', aim_summaries[(idx_base % array_length(aim_summaries,1))+1]),
        jsonb_build_object('title','Next milestone','summary', aim_summaries[((idx_base+1) % array_length(aim_summaries,1))+1])
      ),
      'game', game[idx_game],
      'portfolio', to_jsonb(array[
        'https://'||uname||'.site/portfolio/1',
        'https://'||uname||'.site/portfolio/2'
      ]),
      'customSections', jsonb_build_array(),
      'avatarUrl', avatars[idx_avatar]
    );

    update public.profiles
    set data = data
    where user_id = p.user_id;
  end loop;
end
$$;


