var mysql = require('mysql');
const util = require('util');
const auth = require('./auth');

let __DATA__SCHEMA__ = 'techlympic';

let API = {
    sekolah: {
        first10: (fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query("SELECT * FROM sekolah limit 10", function (err, result) {
                    if (err) {
                        console.log('but with some error: ',err);
                    } else {
                        console.log('... with some data: ',result);
                        con.end();
                        
                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
        search: (q, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query("SELECT * FROM sekolah WHERE upper(namasekolah) regexp  upper(?) limit 15", [q], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();

                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
    },
    user: {
        getUser: async (email) => {
            const val = {
                registered: true,
                data: []
            };
    
            try {
                const connection = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
                const queryAsync = util.promisify(connection.query).bind(connection);
    
                const result = await queryAsync('SELECT * FROM `user` WHERE usr_email = ?', [email]);
    
                connection.end();
    
                const default_val = {
                    usr_role: '--Pilih Jenis Pengguna--',
                    kodsekolah: '',
                    namasekolah: '',
                    alamat1: '',
                    alamat2: '',
                    poskod: '',
                    bandar: '',
                    negeri: '--Pilih Negeri--'
                };
    
                val.registered = result.length > 0;
                val.data = result.length > 0 ? result[0] : default_val;
    
                return val;
            } catch (e) {
                console.log('------ERROR------>', e);
                throw e; // rethrow the error so that it can be caught by the caller
            }
        },
        isExist: (email, fn) => {
            try {
                var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
                con.query("SELECT * FROM user WHERE usr_email = ?", [email], (err, result) => {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        var default_val = {
                            usr_role: '--Pilih Jenis Pengguna--',
                            kodsekolah: '', 
                            namasekolah: '', 
                            alamat1: '', 
                            alamat2: '', 
                            poskod: '', 
                            bandar: '', 
                            negeri: '--Pilih Negeri--'
                        }
                        var val = {
                            registered: result.length>0 ? true : false,
                            data: result.length>0 ? result[0] : default_val
                        }
                        
                        fn(val);
                    }
                });
            } catch (e) {
                console.log('------ERROR------>', e);
            }
        },
        isRegistered: (email, fn)=>{
            if(email=='') return 0;
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try{
                con.query("SELECT * from user WHERE usr_email = ?",[email], 
                function (err, result) {
                    if(result.length > 0){
                        fn({
                            register: false,
                            msg: email + ' telah didaftarkan'
                        });
                    }else {
                        fn({
                            register: true,
                            msg: 'Proceed'
                        })
                    }
                });
            } catch(e){
                console.log(e);
            }
        },
        create : (uid, pass, fn)=>{
            //UPDATE users SET usr_password = AES_ENCRYPT('demo123',CONCAT(usr_name,'sP00n4eat0O0O'))
            if(uid=='' || pass=='') return 0;
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try{
                con.query("insert into user(usr_email,usr_name,usr_password,usr_agent) values(?,?,AES_ENCRYPT(?,CONCAT(?,?)),?)",[uid, uid, pass, uid, auth._SECRET_,'Internal'], 
                function (err, result) {
                    fn({
                      status: true,
                      msg: 'New account has been successfully registered. Please refer to your email for the initial password'
                    });
                });
            } catch(e){
                console.log(e);
                fn({
                  status: false,
                  msg: 'Error accured! registration failed. Sorry for the inconvenience'
                })
            }
        },
        login: (uid, pass, fn)=>{
            if(uid=='' || pass=='') return 0;
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try{
                con.query("SELECT * from user WHERE usr_agent = 'Internal' and usr_email = ? and usr_password = AES_ENCRYPT(?,CONCAT(?,?))",[uid, pass, uid, auth._SECRET_], 
                function (err, result) {
                    if(result.length > 0){
                        var user = {
                            displayName: result[0].usr_name,
                            email: result[0].usr_email,
                            photo: '',
                            agent: 'Internal'
                          }
                        fn({
                            authorized: true,
                            msg: 'User Authorized!',
                            data: user
                        });
                    }else {
                        fn({
                            authorized: false,
                            msg: 'Incorrect Username of Password',
                            data: []
                        })
                    }
                });
            } catch(e){
                console.log(e);
            }
        },
        updatePassword : (uid, pass, fn)=>{
            //UPDATE users SET usr_password = AES_ENCRYPT('demo123',CONCAT(usr_name,'sP00n4eat0O0O'))
            if(uid=='' || pass=='') return 0;
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try{
                con.query(`
                        update user
                            set usr_password = AES_ENCRYPT(?,CONCAT(?,?))
                        where usr_email = ? and usr_agent = ?
                    `,[pass, uid, auth._SECRET_, uid, 'Internal'], 
                function (err, result) {
                    fn({
                      status: true,
                      msg: 'Password has been reset'
                    });
                });
            } catch(e){
                console.log(e);
                fn({
                  status: false,
                  msg: 'Error accured! registration failed. Sorry for the inconvenience'
                })
            }
        },
        register: (data, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query(
                    `INSERT INTO user (usr_name, usr_email, notel, usr_role, usr_agent, kodsekolah, namasekolah, peringkat, alamat1, alamat2, poskod, bandar, negeri)
                    values(?,?,?,?,?,?,?,?,?,?,?,?,?)
                    ON DUPLICATE KEY UPDATE
                        usr_name = ?,
                        notel = ?,
                        usr_role = ?,
                        kodsekolah = ?,
                        namasekolah = ?,
                        peringkat = ?,
                        alamat1 = ?,
                        alamat2 = ?,
                        poskod = ?,
                        bandar = ?,
                        negeri = ?;
                    `, 
                [
                    data.usr_name, 
                    data.usr_email, 
                    data.notel,
                    data.usr_role, 
                    data.usr_agent, 
                    data.kodsekolah, 
                    data.namasekolah, 
                    data.peringkat, 
                    data.alamat1, 
                    data.alamat2, 
                    data.poskod, 
                    data.bandar, 
                    data.negeri, 
                    data.usr_name,
                    data.notel,
                    data.usr_role,
                    data.kodsekolah, 
                    data.namasekolah, 
                    data.peringkat, 
                    data.alamat1, 
                    data.alamat2, 
                    data.poskod, 
                    data.bandar, 
                    data.negeri
                ], (err, result) => {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();

                        fn({message: 'Pendaftaran pengguna berjaya', registered:true});
                    }
                });
            } catch (e) {
                console.log(e);
            }
        }
    },
    peserta: {
        addBulk: (usr, data, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            const fields = ['usr_email','kp','jantina','tarikh_lahir', 'nama', 'email', 'darjah_tingkatan','target_group','kumpulan', 'program'];
            let sql = `INSERT IGNORE INTO peserta (${fields.join(', ')}) VALUES ?`;
            try {
                con.query(sql, [data], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        //con.release();

                        fn({msg: `Inserted ${result.affectedRows} rows`});
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },

        
        updatePasswordBulk: (usr, data, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            const fields = ['kp', 'passcode'];
    
            // Create an array to store the update statements for each row
            const updateStatements = data.map(row => {
                const kp = row.kp;
                const passcode = row.passcode;
                // Construct the update statement with AES_ENCRYPT
                return `
                UPDATE peserta SET pwd = ${mysql.escape(passcode)}, peserta_password = AES_ENCRYPT(${mysql.escape(passcode)}, CONCAT(${mysql.escape(kp)}, ${mysql.escape(auth._SECRET_)})) WHERE kp = ${mysql.escape(kp)} and usr_email = ${mysql.escape(usr)};
                `;
            });
    
            // Join the update statements into a single SQL query
            //let sql = updateStatements.join(' ');
    
            try {
                con.beginTransaction((err) => {
                    if (err) throw err;
                    updateStatements.forEach(sql=>{
                        con.query(sql, function (err, result) {
                            if (err) {
                                con.rollback(() => {
                                throw err;
                              });
                            }
                        });
                    });

                    
                // Commit transaction
                con.commit((err) => {
                    if (err) {
                      con.rollback(() => {
                        throw err;
                      });
                    }
                    //fn(`${pesertaList.length} peserta inserted or updated successfully`);
                  });
              
                  // Close connection
                  con.end();
                  fn(`${updateStatements.length} dikemaskini`);

                });
            } catch (e) {
                console.log(e);
            }
        },

        insertOrUpdate: (pesertaList, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            con.beginTransaction((err) => {
                if (err) throw err;
                
                
                // Loop through pesertaList and build INSERT or UPDATE query
                pesertaList.forEach((peserta) => {
                  const query = `
                    INSERT INTO peserta
                    SET ?
                    ON DUPLICATE KEY UPDATE
                    nama = VALUES(nama),
                    jantina = VALUES(jantina),
                    tarikh_lahir = VALUES(tarikh_lahir),
                    email = VALUES(email),
                    darjah_tingkatan = VALUES(darjah_tingkatan),
                    bangsa = VALUES(bangsa),
                    ipt = VALUES(ipt),
                    bidang = VALUES(bidang),
                    program = VALUES(program)
                  `;
            
                  // Execute query
                  con.query(query, peserta, (err, result) => {
                    if (err) {
                        con.rollback(() => {
                        throw err;
                      });
                    }
                  });
                });
            
                // Commit transaction
                con.commit((err) => {
                  if (err) {
                    con.rollback(() => {
                      throw err;
                    });
                  }
                  //fn(`${pesertaList.length} peserta inserted or updated successfully`);
                });
            
                // Close connection
                con.end();
                fn(`${pesertaList.length} peserta berjaya ditambah/ dikemaskini`);
              });
        },

        deletePesertaNegeri: (grp,usr, fn) =>{
            if(usr=='') return 0;
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);

            var kod = (grp==='Guru')?'kodsekolah=?':'usr_email=?';
            
            try{
                con.query(`delete from peserta_negeri WHERE ${kod}`,[usr], 
                function (err, result) {
                    if(err){
                        fn({
                            status: false,
                            msg: ''
                        });
                    }else {
                        con.end();
                        fn({
                            status: true,
                            msg: 'Proceed'
                        })
                    }
                });
            } catch(e){
                console.log(e);
            }
        },

        insertOrUpdateNegeri: (pesertaList, fn) => {
            try{
                var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
                con.beginTransaction((err) => {
                    if (err) throw err;
                    
                    
                    // Loop through pesertaList and build INSERT or UPDATE query
                    pesertaList.forEach((peserta) => {
                      const query = `
                        INSERT INTO peserta_negeri
                        SET ?
                        ON DUPLICATE KEY UPDATE
                        usr_email = VALUES(usr_email),
                        program = VALUES(program),
                        kumpulan = VALUES(kumpulan)
                      `;
                
                      // Execute query
                      con.query(query, peserta, (err, result) => {
                        if (err) {
                            con.rollback(() => {
                            throw err;
                          });
                        }
                      });
                    });
                
                    // Commit transaction
                    con.commit((err) => {
                      if (err) {
                        con.rollback(() => {
                          throw err;
                        });
                      }
                      //fn(`${pesertaList.length} peserta inserted or updated successfully`);
                    });
                
                    // Close connection
                    con.end();
                    fn(`${pesertaList.length} peserta negeri berjaya ditambah/ dikemaskini`);
                  });
            }catch(err){
                console.log('ERROR insertOrUpdateNegeri(): ', err);
            }
        },

        getKumpulan: (usr, fn)=>{
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try{
                sqlstr = `
                SELECT a.*, b.prog_code, b.prog_name,
                    IFNULL(kumpulan1,'') kumpulan1,
                        IFNULL(kumpulan2,'') kumpulan2,
                        IFNULL(email1,'') email1,
                        IFNULL(email2,'') email2,
                        IFNULL(guru1,'') guru1,
                        IFNULL(guru2,'') guru2
                FROM (SELECT if(length(kodsekolah)>2,kodsekolah,usr_email) kodsekolah, usr_email, peringkat target_group FROM user WHERE usr_email = ?) a
                LEFT JOIN program b USING(target_group)
                LEFT JOIN peserta_negeri_kumpulan c USING(kodsekolah,prog_code)
                WHERE b.prog_code not in('5.3K','5.3R','5.3B','5.4R')
                `;
                con.query(sqlstr, [usr], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(result);
                        con.end();

                        fn(result);
                    }
                });
            }catch(err){
                console.log('Error getKumpulan: ', err);
            }
        },

        saveKumpulan: (kumpulan, fn)=>{
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try{
                con.beginTransaction((err) => {
                    if (err) throw err;

                    kumpulan.forEach((grp) => {
                        sqlstr = `
                        INSERT INTO peserta_negeri_kumpulan
                            SET ?
                            ON DUPLICATE KEY UPDATE
                            kumpulan1 = value(kumpulan1),
                            email1 = value(email1),
                            kumpulan2 = value(kumpulan2),
                            email2 = value(email2),
                            guru1 = value(guru1),
                            guru2 = value(guru2)
                        `;

                        con.query(sqlstr, grp, function (err, result) {
                            if (err) {
                                con.rollback(() => {
                                throw err;
                              });
                              fn([]);
                            } 
                        });
                    });

                    // Commit transaction
                    con.commit((err) => {
                        if (err) {
                        con.rollback(() => {
                            throw err;
                        });
                        }
                        //fn(`${pesertaList.length} peserta inserted or updated successfully`);
                    });
                
                    // Close connection
                    con.end();
                    fn(`${kumpulan.length} rekod telah dikemaskini`);

                });

                
            }catch(err){
                console.log('Error saveKumpulan: ', err);
            }
        },

        countPenyertaan: (usr_email, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                sqlstr = `
                SELECT 1 jenis, 'Jumlah Peserta' prog_name,'' nama, '' notel, COUNT(*) peserta, 0 k1, 0 k2
                FROM peserta where usr_email = ?
                
                UNION 
                
                SELECT 1 jenis, 'Peserta telah didaftarkan program' prog_name,'' nama, '' notel, COUNT(*) peserta, 0 k1, 0 k2
                FROM peserta WHERE program <> '' and usr_email = ?
                
                UNION 
                
                SELECT 1 jenis, 'Peserta belum didaftarkan program' prog_name,'' nama, '' notel, COUNT(*) peserta, 0 k1, 0 k2
                FROM peserta WHERE program = '' and usr_email = ?
                
                UNION 
                
                SELECT 2 jenis, aa.prog_name,'' nama, '' notel, ifnull(bb.peserta,0) peserta, 0 k1, 0 k2
                FROM (
                   SELECT b.prog_code, b.prog_name, b.prog_desc, b.theme, b.color, b.target_group 
                    FROM (SELECT usr_role, usr_email, if(usr_role='Ibu Bapa','All',peringkat) lvl, peringkat FROM user WHERE usr_email=? ) a
                    left JOIN (SELECT prog_code, prog_name, prog_desc, theme, color, target_group from program) b
                    ON if(usr_role='Ibu Bapa','All',peringkat) = if(usr_role='Ibu Bapa','All',b.target_group) 
                    ORDER BY target_group, b.prog_code
                ) aa
                LEFT JOIN 
                (SELECT p prog_name, COUNT(*) peserta
                FROM(
                SELECT 
                kp,if(replace(replace(replace(a.program,'(',''),')',''),'*','') REGEXP replace(replace(replace(b.prog_name,'(',''),')',''),'*',''), b.prog_name,'') p
                FROM peserta a, program b
                where a.usr_email = ?
                ) m 
                WHERE m.p <> ''
                GROUP BY m.p) bb USING(prog_name)
                
                UNION

                SELECT 3 jenis, usr_email prog_name, usr_name nama, notel, SUM(if(kp IS NULL,0,1)) peserta, lpad(userid,6,0) k1, 0 k2 FROM(
                    SELECT b.userid, b.usr_email, b.usr_name, b.notel, c.kp from
                    (SELECT kodsekolah, usr_email FROM user WHERE usr_email = ?) a
                    LEFT JOIN user b USING(kodsekolah)
                    LEFT JOIN peserta c ON c.usr_email = b.usr_email) v
                    GROUP BY usr_email
                
                    UNION 
                    SELECT * FROM (
                             SELECT 3 jenis, 'Guru Pengiring' prog_name, ucase(guru1) nama, '' notel, 0 peserta, 
                             CONCAT(lpad(grpid,6,0),'-',1) k1, 0 k2 
                             FROM peserta_negeri_kumpulan WHERE  usr_email = ? AND guru1 <> ''
                        
                        UNION 
                             SELECT 3 jenis, 'Guru Pengiring' prog_name, ucase(guru2) nama, '' notel, 0 peserta, 
                             CONCAT(lpad(grpid,6,0),'-',2) k1, 0 k2 
                             FROM peserta_negeri_kumpulan WHERE  usr_email = ? AND guru2 <> ''
                         ) g GROUP BY jenis, nama  
                         
                UNION
                
                SELECT 4 jenis, program prog_name, '' nama, '' notel, COUNT(*) peserta, SUM(if(kumpulan=1,1,0)) k1, SUM(if(kumpulan=2,1,0)) k2
                FROM 
                (SELECT b.* FROM 
                (SELECT kodsekolah, usr_email FROM user WHERE usr_email = ?) a
                LEFT JOIN peserta_negeri b USING(kodsekolah)) h
                GROUP BY program;
                `
                con.query(sqlstr, [usr_email,usr_email,usr_email,usr_email,usr_email,usr_email,usr_email,usr_email,usr_email], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();

                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
        loadPeserta: (email, peringkat, fn) => {
            var _peringkat = (peringkat === 'sekolah'? '' : ('_' + peringkat));
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query(`select kp,nama,email,darjah_tingkatan,bangsa,jantina,DATE_FORMAT(tarikh_lahir, "%Y-%m-%d") tarikh_lahir,ipt,bidang,program from peserta${_peringkat} where usr_email = ?`, [email], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        //console.log(result);
                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
        getPesertaID: async (kp, usr) => {
            const val = {
                registered: true,
                data: []
            };
    
            try {
                const connection = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
                const queryAsync = util.promisify(connection.query).bind(connection);
    
                const result = await queryAsync('select lpad(id,6,0) id, kp, nama from peserta where kp = ? and usr_email=?', [kp, usr]);
    
                connection.end();
    
                const default_val = {
                    id: '',
                    nama: '',
                    kp: ''
                };
    
                val.registered = result.length > 0;
                val.data = result.length > 0 ? result[0] : default_val;

                console.log('val---->',val);
    
                return val;
            } catch (e) {
                console.log('------ERROR------>', e);
                throw e; // rethrow the error so that it can be caught by the caller
            }
        },
        loadPesertaList: (email, peringkat, fn) => {
            var _peringkat = (peringkat === 'sekolah'? '' : ('_' + peringkat));
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query(`select kp,nama,email,darjah_tingkatan,bangsa,jantina,DATE_FORMAT(tarikh_lahir, "%Y-%m-%d") tarikh_lahir,program from peserta${_peringkat} where usr_email = ?`, [email], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        //console.log(result);
                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
        deletePeserta: (email, kp, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query(`delete from peserta where usr_email = ? and kp = ?`, [email, kp], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        //console.log(result);
                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
        loadPesertaNegeri: (email, peringkat, fn) => {
            var _peringkat = (peringkat === 'sekolah'? '' : ('_' + peringkat));
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query(`
                SELECT kp,nama,email,darjah_tingkatan,bangsa,jantina,tarikh_lahir,program, program_negeri, kod_program_negeri, kumpulan, COUNT(*) total FROM(
                    SELECT a.kp,a.nama,a.email,a.darjah_tingkatan,a.bangsa,a.jantina,
                    DATE_FORMAT(a.tarikh_lahir, "%Y-%m-%d") tarikh_lahir,
                    a.program, ifnull(b.program,'') program_negeri, 
                    IFNULL(replace(TRIM(SUBSTRING_INDEX(b.program, ' ', 1)),'.',''),'') kod_program_negeri, 
                    IFNULL(b.kumpulan,0) kumpulan
                    FROM (
                        SELECT kodsekolahx kodsekolah, 
                        b.usr_email, b.peringkat target_group
                        FROM 
                        (SELECT if(length(kodsekolah)>2,kodsekolah,usr_email) kodsekolahx FROM user m WHERE usr_email = ?) a
                        LEFT JOIN (select m.usr_email, m.peringkat, if(length(kodsekolah)>2,kodsekolah,usr_email) kodsekolahx FROM user m) b 
                                              USING(kodsekolahx)
                    ) c
                    LEFT JOIN peserta a ON c.usr_email = a.usr_email
                    LEFT JOIN (SELECT w.*,if(length(kodsekolah)>2,kodsekolah,usr_email) kodsekolahx from peserta_negeri w) b ON c.kodsekolah = b.kodsekolahx and  a.kp = b.kp
                ) w where kp is not null GROUP BY kp ORDER BY kod_program_negeri, kumpulan;
                `, [email], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        //console.log(result);
                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
        loadPesertaNegeriPrint: (email, peringkat, fn) => {
            var _peringkat = (peringkat === 'sekolah'? '' : ('_' + peringkat));
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query(`
                SELECT a.kp,a.nama,a.email,a.darjah_tingkatan,a.bangsa,a.jantina,
                DATE_FORMAT(a.tarikh_lahir, "%Y-%m-%d") tarikh_lahir, ifnull(b.program,'') program_negeri, 
                IFNULL(b.kumpulan,0) kumpulan
                FROM (
                    SELECT if(length(b.kodsekolah)>2,b.kodsekolah,b.usr_email) kodsekolah, 
                    b.usr_email, b.peringkat target_group
                    FROM 
                    (SELECT * FROM user WHERE usr_email = ?) a
                    LEFT JOIN user b USING(kodsekolah)
                ) c
                LEFT JOIN peserta a ON c.usr_email = a.usr_email
                LEFT JOIN peserta_negeri b ON c.kodsekolah = b.kodsekolah and  a.kp = b.kp
                where kumpulan > 0
                order by program_negeri, kumpulan;
                `, [email], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        //console.log(result);
                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
        loadGuruNegeriPrint: (email, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query(`
                SELECT * FROM(
                    SELECT b.prog_name,1 kumpulan,kumpulan1 nama_kumpulan,email1 email,guru1 guru
                    FROM (
							  SELECT h.* FROM 
	                    (SELECT kodsekolah FROM user WHERE usr_email=?) g
	                    LEFT JOIN  peserta_negeri_kumpulan h USING(kodsekolah)
						  ) a 
                    LEFT JOIN program b USING(prog_code)
                    WHERE length(CONCAT(kumpulan1,email1,guru1)) > 2
                    UNION 
                    SELECT b.prog_name,2 kumpulan,kumpulan2 nama_kumpulan,email2 email,guru2 guru
                    FROM (
							  SELECT h.* FROM 
	                    (SELECT kodsekolah FROM user WHERE usr_email=?) g
	                    LEFT JOIN  peserta_negeri_kumpulan h USING(kodsekolah)
						  ) a 
                    LEFT JOIN program b USING(prog_code)
                    WHERE length(CONCAT(kumpulan2,email2,guru2)) > 2
                    ) w
                    ORDER BY prog_name, kumpulan;
                `, [email,email], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        //console.log(result);
                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
    },
    program: {
        list: (usr, fn) => {
            //console.log('my user is: ', usr);
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                /*
                SELECT b.prog_code, b.prog_name, b.prog_desc, b.theme, b.color, b.target_group 
                FROM (SELECT usr_email, peringkat FROM user ` + (usr ==='--none--'?'':'WHERE usr_email=?') + ` ) a
                left join program b
                ON a.peringkat = b.target_group
                ORDER BY b.prog_code
                */
                var sql = `
                SELECT b.prog_code, b.prog_name, b.prog_desc, b.theme, b.color, b.target_group 
                FROM (SELECT usr_role, usr_email, if(usr_role='Ibu Bapa','All',peringkat) lvl, peringkat FROM user ` + (usr ==='--none--'?'':'WHERE usr_email=?') + ` ) a
                left JOIN (SELECT prog_code, prog_name, prog_desc, theme, color, target_group from program) b
                ON if(usr_role='Ibu Bapa','All',peringkat) = if(usr_role='Ibu Bapa','All',b.target_group) 
                ORDER BY target_group, b.prog_code
                `;
                con.query(sql, [usr],function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();

                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        }
    }
}

module.exports = API;