SELECT staff_id, section, can_view, can_edit, can_delete FROM staff_permissions 
WHERE staff_id = (SELECT id FROM users WHERE email='john.smith@orbem.com') 
ORDER BY section;