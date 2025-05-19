import unittest

import tornado.testing


TEST_MODULES = [
    "tests.model_tests",
    "tests.resource_tests",
    "tests.api_tests",
]


def all():
    return unittest.defaultTestLoader.loadTestsFromNames(TEST_MODULES)


if __name__ == "__main__":
    tornado.testing.main()
