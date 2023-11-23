import unittest

from tornado.options import define
import tornado.testing


TEST_MODULES = [
    "tests.model_tests",
    "tests.resource_tests",
    "tests.api_tests",
]


def all():
    return unittest.defaultTestLoader.loadTestsFromNames(TEST_MODULES)


def main():
    define(
        "config",
        default="config.json",
        type=str,
        help="path to config file, defaults to config.json",
    )
    tornado.testing.main()


if __name__ == "__main__":
    main()
