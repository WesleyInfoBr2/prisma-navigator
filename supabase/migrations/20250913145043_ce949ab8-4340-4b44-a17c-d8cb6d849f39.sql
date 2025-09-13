-- Update user wesleyinfo@gmail.com to admin role
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT user_id 
  FROM profiles 
  WHERE email = 'wesleyinfo@gmail.com'
);