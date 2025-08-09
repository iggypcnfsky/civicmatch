-- Demo data seeding: creates realistic profiles and conversations with an existing user
-- How to use:
-- 1) Replace the placeholder email below with an existing user's email in your project
-- 2) Run this script in Supabase SQL Editor (service role) or via CLI

do
$$
declare
  v_existing_email text := '<REPLACE_WITH_EXISTING_EMAIL>'; -- <-- set this before running
  v_existing_user  uuid;
  v_user_id        uuid;
  v_conv_id        uuid;
  v_idx            int := 0;
  payload          jsonb := jsonb_build_array(
    jsonb_build_object(
      'email','ada@civicmatch.demo','displayName','Ada Lovelace','bio','I connect data and policy for climate innovation.','location', jsonb_build_object('city','London','country','UK'),
      'skills', jsonb_build_array('Data Science','Policy','Product'),
      'tags',   jsonb_build_array('Climate','AI','GovTech'),
      'links',  jsonb_build_array('https://adalabs.org','https://x.com/ada'),
      'avatarUrl','https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=800&auto=format&fit=crop'
    ),
    jsonb_build_object(
      'email','nelson@civicmatch.demo','displayName','Nelson Mandela','bio','Bridging communities through justice and reconciliation.','location', jsonb_build_object('city','Johannesburg','country','South Africa'),
      'skills', jsonb_build_array('Leadership','Community','Policy'),
      'tags',   jsonb_build_array('Justice','Civic Tech'),
      'links',  jsonb_build_array('https://mandela.org'),
      'avatarUrl','https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop'
    ),
    jsonb_build_object(
      'email','grace@civicmatch.demo','displayName','Grace Hopper','bio','Engineering reliable systems and empowering teams.','location', jsonb_build_object('city','New York','country','USA'),
      'skills', jsonb_build_array('Engineering','DX','Education'),
      'tags',   jsonb_build_array('Open Source','GovTech'),
      'links',  jsonb_build_array('https://grace.dev'),
      'avatarUrl','https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=800&auto=format&fit=crop'
    ),
    jsonb_build_object(
      'email','wangari@civicmatch.demo','displayName','Wangari Maathai','bio','Reforestation and community-based climate action.','location', jsonb_build_object('city','Nairobi','country','Kenya'),
      'skills', jsonb_build_array('Environmental Science','Organizing'),
      'tags',   jsonb_build_array('Climate','Forestry'),
      'links',  jsonb_build_array('https://greenbeltmovement.org'),
      'avatarUrl','https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=800&auto=format&fit=crop'
    ),
    jsonb_build_object(
      'email','malala@civicmatch.demo','displayName','Malala Yousafzai','bio','Girls’ education and human rights advocate.','location', jsonb_build_object('city','Mingora','country','Pakistan'),
      'skills', jsonb_build_array('Advocacy','Storytelling'),
      'tags',   jsonb_build_array('Education','Human Rights'),
      'links',  jsonb_build_array('https://malala.org'),
      'avatarUrl','https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?q=80&w=800&auto=format&fit=crop'
    ),
    jsonb_build_object(
      'email','elon@civicmatch.demo','displayName','Elon Musk','bio','Scaling climate tech and transportation.','location', jsonb_build_object('city','Austin','country','USA'),
      'skills', jsonb_build_array('Engineering','Product','Operations'),
      'tags',   jsonb_build_array('Climate','Space','EVs'),
      'links',  jsonb_build_array('https://tesla.com'),
      'avatarUrl','https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=800&auto=format&fit=crop'
    ),
    jsonb_build_object(
      'email','katherine@civicmatch.demo','displayName','Katherine Johnson','bio','Mathematics for navigation and spaceflight.','location', jsonb_build_object('city','White Sulphur Springs','country','USA'),
      'skills', jsonb_build_array('Mathematics','Data','Research'),
      'tags',   jsonb_build_array('STEM','Space'),
      'links',  jsonb_build_array('https://nasa.gov'),
      'avatarUrl','https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop'
    ),
    jsonb_build_object(
      'email','timnit@civicmatch.demo','displayName','Timnit Gebru','bio','Ethical AI and accountability.','location', jsonb_build_object('city','San Francisco','country','USA'),
      'skills', jsonb_build_array('AI Ethics','Research','Policy'),
      'tags',   jsonb_build_array('AI','Ethics'),
      'links',  jsonb_build_array('https://da-ir.org'),
      'avatarUrl','https://images.unsplash.com/photo-1546456073-92b9f0a8d413?q=80&w=800&auto=format&fit=crop'
    )
  );
begin
  select u.id into v_existing_user from auth.users u where u.email = v_existing_email;
  if v_existing_user is null then
    raise notice 'Existing user email % not found; conversations will be skipped', v_existing_email;
  end if;

  for v_idx, v_user_id in
    select row_number() over (),
           coalesce(
             (select u.id from auth.users u where u.email = (rec.obj->>'email')),
             (select (auth.create_user(email => (rec.obj->>'email'), password => 'Passw0rd!', email_confirm => true)).id)
           ) as user_id
    from jsonb_array_elements(payload) as rec(obj)
  loop
    -- Build profile data jsonb
    perform 1;
    -- Upsert profile
    insert into public.profiles (user_id, username, data)
    values (
      v_user_id,
      (select rec.obj->>'email' from jsonb_array_elements(payload) as rec(obj) limit 1 offset v_idx-1),
      jsonb_build_object(
        'displayName', (select rec.obj->>'displayName' from jsonb_array_elements(payload) as rec(obj) limit 1 offset v_idx-1),
        'bio',         (select rec.obj->>'bio'         from jsonb_array_elements(payload) as rec(obj) limit 1 offset v_idx-1),
        'location',    (select rec.obj->'location'     from jsonb_array_elements(payload) as rec(obj) limit 1 offset v_idx-1),
        'skills',      (select rec.obj->'skills'       from jsonb_array_elements(payload) as rec(obj) limit 1 offset v_idx-1),
        'tags',        (select rec.obj->'tags'         from jsonb_array_elements(payload) as rec(obj) limit 1 offset v_idx-1),
        'links',       (select rec.obj->'links'        from jsonb_array_elements(payload) as rec(obj) limit 1 offset v_idx-1),
        'avatarUrl',   (select rec.obj->>'avatarUrl'   from jsonb_array_elements(payload) as rec(obj) limit 1 offset v_idx-1)
      )
    )
    on conflict (user_id) do update set username = excluded.username, data = excluded.data;

    -- Create a demo conversation with the existing user for the first 5 demo users
    if v_existing_user is not null and v_idx <= 5 then
      select c.id into v_conv_id
      from public.conversations c
      where exists (
        select 1 from jsonb_array_elements_text(c.data->'participantIds') pid where pid = v_existing_user::text
      )
      and exists (
        select 1 from jsonb_array_elements_text(c.data->'participantIds') pid where pid = v_user_id::text
      )
      limit 1;

      if v_conv_id is null then
        insert into public.conversations (data)
        values (jsonb_build_object('participantIds', jsonb_build_array(v_existing_user::text, v_user_id::text)))
        returning id into v_conv_id;

        insert into public.messages (conversation_id, sender_id, data, created_at)
        values
          (v_conv_id, v_existing_user, jsonb_build_object('text','Hey there, great to connect!','attachments', jsonb_build_array()), now() - interval '10 minutes'),
          (v_conv_id, v_user_id,       jsonb_build_object('text','Likewise — excited to chat.','attachments', jsonb_build_array()), now() - interval '8 minutes'),
          (v_conv_id, v_existing_user, jsonb_build_object('text','What are you focused on right now?','attachments', jsonb_build_array()), now() - interval '6 minutes');
      end if;
    end if;
  end loop;
end
$$;


