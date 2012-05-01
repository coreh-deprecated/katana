struct var_t { long long int data[2]; };

#ifdef __x86_64__
struct var_t var_from_int(long long int);
struct var_t var_from_uint(unsigned long long int);
struct var_t var_from_float(double);
#else
struct var_t var_from_int(long int);
struct var_t var_from_uint(unsigned long int);
struct var_t var_from_float(float);
#endif

struct var_t var_from_int64(long long int);
struct var_t var_from_int32(long int);
struct var_t var_from_int16(short int);
struct var_t var_from_int8(char);

struct var_t var_from_uint64(unsigned long long int);
struct var_t var_from_uint32(unsigned long int);
struct var_t var_from_uint16(unsigned short int);
struct var_t var_from_uint8(unsigned char);

struct var_t var_from_float64(double);
struct var_t var_from_float32(float);

#ifdef __x86_64__
long long int var_to_int(struct var_t);
unsigned long long int var_to_uint(struct var_t);
double var_to_float(struct var_t);
#else
long int var_to_int(struct var_t);
unsigned long int var_to_uint(struct var_t);
float var_to_float(struct var_t);
#endif

long long int var_to_int64(struct var_t);
long int var_to_int32(struct var_t);
short int var_to_int16(struct var_t);
char var_to_int8(struct var_t);

unsigned long long int var_to_uint64(struct var_t);
unsigned long int var_to_uint32(struct var_t);
unsigned short int var_to_uint16(struct var_t);
unsigned char var_to_uint8(struct var_t);

double var_to_float64(struct var_t);
float var_to_float32(struct var_t);

