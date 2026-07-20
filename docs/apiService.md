# Strucutre

`baseService` provide only basic HTTP calls. The other domain specific services
will be splitted into files such as `authService`, `productService`, `categoryService`.

The `baseService` should provide the appropriate acredentials the project is currently using whether JWT or otherwise.
