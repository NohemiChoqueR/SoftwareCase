from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class UserAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/usuarios/auth/register/'
        self.login_url = '/api/usuarios/auth/login/'

    def test_register_success(self):
        payload = {
            'email': 'nuevo@example.com',
            'first_name': 'Juan',
            'last_name': 'Perez',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!'
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertEqual(response.data['user']['email'], 'nuevo@example.com')
        self.assertTrue(User.objects.filter(email='nuevo@example.com').exists())

    def test_register_password_mismatch(self):
        payload = {
            'email': 'fail@example.com',
            'password': 'Password123!',
            'password_confirm': 'Different123!'
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_register_duplicate_email(self):
        User.objects.create_user(email='duplicado@example.com', password='Password123!')
        payload = {
            'email': 'duplicado@example.com',
            'password': 'Password123!',
            'password_confirm': 'Password123!'
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
