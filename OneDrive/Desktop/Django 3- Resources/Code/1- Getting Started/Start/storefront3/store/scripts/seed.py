from store.models import Collection, Product, Customer
from django.contrib.auth import get_user_model
from decimal import Decimal
from store.models import OrderItem

# Clear existing data (optional, for fresh seeding)
OrderItem.objects.all().delete()
Product.objects.all().delete()
Collection.objects.all().delete()
get_user_model().objects.filter(email='admin@app.com').delete() # Delete admin user if exists
Customer.objects.all().delete()


# Create Collections
collection1, _ = Collection.objects.get_or_create(title='Books')
collection2, _ = Collection.objects.get_or_create(title='Electronics')
collection3, _ = Collection.objects.get_or_create(title='Apparel')

# Create Products
Product.objects.create(
    title='The Lord of the Rings',
    slug='the-lord-of-the-rings',
    description='Epic fantasy novel.',
    unit_price=Decimal('15.50'),
    inventory=50,
    collection=collection1
)
Product.objects.create(
    title='Laptop Pro X',
    slug='laptop-pro-x',
    description='High performance laptop.',
    unit_price=Decimal('1200.00'),
    inventory=20,
    collection=collection2
)
Product.objects.create(
    title='Vintage T-Shirt',
    slug='vintage-t-shirt',
    description='Comfortable cotton t-shirt.',
    unit_price=Decimal('25.00'),
    inventory=100,
    collection=collection3
)
Product.objects.create(
    title='The Hobbit',
    slug='the-hobbit',
    description='A classic fantasy novel by J.R.R. Tolkien.',
    unit_price=Decimal('12.75'),
    inventory=75,
    collection=collection1
)
Product.objects.create(
    title='Wireless Headphones',
    slug='wireless-headphones',
    description='Noise-cancelling over-ear headphones.',
    unit_price=Decimal('199.99'),
    inventory=30,
    collection=collection2
)

# Create a Superuser and Customer
User = get_user_model()
admin_user, _ = User.objects.get_or_create(
    email='admin@app.com',
    defaults={
        'password': 'admin',
        'first_name': 'Admin',
        'last_name': 'User',
        'username': 'admin@app.com',
        'is_staff': True,
        'is_superuser': True
    }
)

customer, _ = Customer.objects.get_or_create(
    user=admin_user,
    defaults={
        'phone': '123-456-7890',
        'birth_date': '1990-01-01',
        'membership': 'G'
    }
)

print("Database seeded successfully with sample data!")
