alter table organization_applications
add column if not exists category text,
add column if not exists organization_description text,
add column if not exists image_url text;

alter table organizations
add column if not exists category text,
add column if not exists image_url text;

update organization_applications
set
  category = coalesce(category, 'Education'),
  organization_description = coalesce(
    organization_description,
    'A volunteer organization focused on mentorship, learning support, and community technology programs.'
  ),
  image_url = coalesce(
    image_url,
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'
  )
where category is null
   or organization_description is null
   or image_url is null;

update organizations
set
  category = coalesce(
    category,
    case
      when description ilike '%Environment%' then 'Environment'
      when description ilike '%Education%' then 'Education'
      when description ilike '%Food Security%' then 'Food Security'
      when description ilike '%Animal Welfare%' then 'Animal Welfare'
      when description ilike '%Arts & Culture%' then 'Arts & Culture'
      when description ilike '%Senior Services%' then 'Senior Services'
      when description ilike '%Health & Wellness%' then 'Health & Wellness'
      when description ilike '%Housing%' then 'Housing'
      when description ilike '%Youth Programs%' then 'Youth Programs'
      else 'Other'
    end
  ),
  image_url = coalesce(
    image_url,
    case
      when description ilike '%Environment%' then 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80'
      when description ilike '%Education%' then 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80'
      when description ilike '%Food Security%' then 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80'
      when description ilike '%Animal Welfare%' then 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=80'
      when description ilike '%Arts & Culture%' then 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80'
      when description ilike '%Senior Services%' then 'https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=1200&q=80'
      when description ilike '%Health & Wellness%' then 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80'
      when description ilike '%Housing%' then 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'
      when description ilike '%Youth Programs%' then 'https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1200&q=80'
      else 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'
    end
  );
